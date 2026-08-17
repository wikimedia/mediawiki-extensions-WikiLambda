<?php
/**
 * WikiLambda MainStash implementation of AWArticleStore
 *
 * Stores AW Article Sections and AW Article Metadata in MediaWiki's MainStash
 * (`getMainObjectStash()`), an x2 replicated key/value substrate with TTL
 * cleanup. This is an alternative to the RDBMS-backed DBAWArticleStore, used
 * where the durability semantics of a derivative cache (refreshed periodically
 * by a maintenance script) are sufficient. See T426873 for background.
 *
 * Because MainStash is a flat key/value store, the per-topic listing required
 * by getSectionsForTopic() is sourced from the topic's AWArticleMetadata
 * payload — specifically `payload['sections']`, an array of section QIDs that
 * the caller (e.g. the section-rendering maintenance script) maintains as the
 * manifest of which sections belong to the topic. getSectionsForTopic() then
 * fetches each listed section in the requested locale and skips those that
 * have not (yet) been rendered. Consequence: a topic with no metadata is not
 * enumerable, which is by design — the metadata is the source of truth.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics;
use OverflowException;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Stats\StatsFactory;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class MainStashAWArticleStore extends AWArticleStore {

	public const KEY_PREFIX = 'WikiLambdaAWArticleStore';

	private const METRIC_STORE = 'aw_article';

	/**
	 * TTL for stored sections and metadata. Picked to comfortably outlive
	 * the (weekly-to-monthly) refresh cadence of the maintenance script, so
	 * that a missed refresh window does not silently evict article content.
	 */
	public const ENTRY_TTL = BagOStuff::TTL_MONTH * 6;

	/**
	 * Maximum allowed payload size (in bytes) for a single section or for a
	 * JSON-encoded metadata payload. Sized to sit comfortably below the
	 * per-value limit of Wikimedia's production MainStash backend
	 * (SqlBagOStuff on x2), leaving headroom for PHP serialize() framing
	 * around our wrapper array. Writes above this threshold raise
	 * OverflowException so the caller is told loudly rather than discovering
	 * later via a silent BagOStuff::set() => false.
	 */
	public const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024;

	private readonly StoreOpsMetrics $metrics;

	public function __construct(
		private readonly BagOStuff $stash,
		?StatsFactory $statsFactory = null
	) {
		$this->metrics = new StoreOpsMetrics( 'mainstash', $statsFactory );
	}

	private function makeSectionKey(
		string $topicQid,
		string $sectionQid,
		string $locale,
		int $schemaVersion
	): string {
		return $this->stash->makeGlobalKey(
			self::KEY_PREFIX,
			'section',
			$topicQid,
			$sectionQid,
			$locale,
			'v' . $schemaVersion
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getSection(
		string $topicQid,
		string $sectionQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): ?AWSection {
		// Matches DBAWArticleStore: the metadata key is not addressable via getSection().
		if ( $sectionQid === self::AW_STORAGE_METADATA_KEY ) {
			return null;
		}

		$startTime = hrtime( true );
		$raw = $this->stash->get(
			$this->makeSectionKey( $topicQid, $sectionQid, $locale, $schemaVersion )
		);
		if ( !is_array( $raw ) ) {
			$this->metrics->recordOp( self::METRIC_STORE, 'get', 'miss', $startTime );
			return null;
		}
		$this->metrics->recordOp( self::METRIC_STORE, 'get', 'hit', $startTime );

		return new AWSection(
			$raw['topicQid'],
			$raw['sectionQid'],
			$raw['locale'],
			$raw['payload'],
			new ConvertibleTimestamp( $raw['lastUpdated'] ),
			$raw['schemaVersion'] ?? $schemaVersion
		);
	}

	/**
	 * @inheritDoc
	 *
	 * Reads the list of section QIDs from the topic's AWArticleMetadata payload
	 * (`payload['sections']`), then fetches each section in the requested locale,
	 * skipping any that have not been rendered yet for that locale. A topic with
	 * no metadata, or with metadata that lacks a 'sections' array, returns [].
	 */
	public function getSectionsForTopic(
		string $topicQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): array {
		$metadata = $this->getArticleMetadata( $topicQid, $schemaVersion );
		if ( $metadata === null ) {
			return [];
		}

		$sectionQids = $metadata->getPayload()['sections'] ?? null;
		if ( !is_array( $sectionQids ) || $sectionQids === [] ) {
			return [];
		}

		$out = [];
		foreach ( $sectionQids as $sectionQid ) {
			// The metadata sentinel is never a real section; defend against
			// malformed payloads leaking it into the manifest.
			if ( $sectionQid === self::AW_STORAGE_METADATA_KEY ) {
				continue;
			}
			$section = $this->getSection( $topicQid, $sectionQid, $locale, $schemaVersion );
			if ( $section !== null ) {
				$out[] = $section;
			}
		}
		return $out;
	}

	/**
	 * @inheritDoc
	 *
	 * @throws OverflowException if the section's payload exceeds
	 *   self::MAX_PAYLOAD_BYTES bytes (and so would not fit in the underlying
	 *   MainStash backend).
	 */
	public function setSection( AWSection $section ): bool {
		$payloadSize = strlen( $section->getPayload() );
		if ( $payloadSize > self::MAX_PAYLOAD_BYTES ) {
			throw new OverflowException( sprintf(
				'AWSection payload for topic %s / section %s / locale %s is '
					. '%d bytes, exceeding the MainStash limit of %d bytes.',
				$section->getTopicQid(),
				$section->getSectionQid(),
				$section->getLocale(),
				$payloadSize,
				self::MAX_PAYLOAD_BYTES
			) );
		}

		$now = ConvertibleTimestamp::now();
		$startTime = hrtime( true );

		$success = $this->stash->set(
			$this->makeSectionKey(
				$section->getTopicQid(),
				$section->getSectionQid(),
				$section->getLocale(),
				$section->getSchemaVersion()
			),
			[
				'topicQid' => $section->getTopicQid(),
				'sectionQid' => $section->getSectionQid(),
				'locale' => $section->getLocale(),
				'schemaVersion' => $section->getSchemaVersion(),
				'payload' => $section->getPayload(),
				'lastUpdated' => $now,
			],
			self::ENTRY_TTL
		);
		$this->metrics->recordOp( self::METRIC_STORE, 'set', $success ? 'success' : 'failure', $startTime );

		return $success;
	}

	/**
	 * @inheritDoc
	 */
	public function deleteSection(
		string $topicQid,
		string $sectionQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): void {
		$startTime = hrtime( true );
		$success = $this->stash->delete(
			$this->makeSectionKey( $topicQid, $sectionQid, $locale, $schemaVersion )
		);
		$this->metrics->recordOp( self::METRIC_STORE, 'delete', $success ? 'success' : 'failure', $startTime );
	}

	/**
	 * @inheritDoc
	 */
	public function getArticleMetadata(
		string $topicQid,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): ?AWArticleMetadata {
		$startTime = hrtime( true );
		$raw = $this->stash->get(
			$this->makeSectionKey(
				$topicQid,
				self::AW_STORAGE_METADATA_KEY,
				self::AW_STORAGE_LOCALE_MULTILINGUAL,
				$schemaVersion
			)
		);
		if ( !is_array( $raw ) ) {
			$this->metrics->recordOp( self::METRIC_STORE, 'get', 'miss', $startTime );
			return null;
		}
		$this->metrics->recordOp( self::METRIC_STORE, 'get', 'hit', $startTime );

		// The payload is JSON-encoded on write, matching DBAWArticleStore.
		$payload = json_decode( $raw['payload'], true ) ?? [];

		return new AWArticleMetadata(
			$raw['topicQid'],
			$payload,
			new ConvertibleTimestamp( $raw['lastUpdated'] ),
			$raw['schemaVersion'] ?? $schemaVersion
		);
	}

	/**
	 * @inheritDoc
	 *
	 * @throws OverflowException if the JSON-encoded metadata payload exceeds
	 *   self::MAX_PAYLOAD_BYTES bytes.
	 */
	public function setArticleMetadata( AWArticleMetadata $metadata ): bool {
		$topicQid = $metadata->getTopicQid();
		$schemaVersion = $metadata->getSchemaVersion();

		$encodedPayload = json_encode( $metadata->getPayload() );
		$payloadSize = strlen( $encodedPayload );
		if ( $payloadSize > self::MAX_PAYLOAD_BYTES ) {
			throw new OverflowException( sprintf(
				'AWArticleMetadata payload for topic %s is %d bytes '
					. '(JSON-encoded), exceeding the MainStash limit of %d bytes.',
				$topicQid,
				$payloadSize,
				self::MAX_PAYLOAD_BYTES
			) );
		}

		$now = ConvertibleTimestamp::now();
		$startTime = hrtime( true );

		$success = $this->stash->set(
			$this->makeSectionKey(
				$topicQid,
				self::AW_STORAGE_METADATA_KEY,
				self::AW_STORAGE_LOCALE_MULTILINGUAL,
				$schemaVersion
			),
			[
				'topicQid' => $topicQid,
				'sectionQid' => self::AW_STORAGE_METADATA_KEY,
				'locale' => self::AW_STORAGE_LOCALE_MULTILINGUAL,
				'schemaVersion' => $schemaVersion,
				'payload' => $encodedPayload,
				'lastUpdated' => $now,
			],
			self::ENTRY_TTL
		);
		$this->metrics->recordOp( self::METRIC_STORE, 'set', $success ? 'success' : 'failure', $startTime );

		return $success;
	}

	/**
	 * @inheritDoc
	 */
	public function deleteArticleMetadata(
		string $topicQid,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): void {
		$startTime = hrtime( true );
		$success = $this->stash->delete(
			$this->makeSectionKey(
				$topicQid,
				self::AW_STORAGE_METADATA_KEY,
				self::AW_STORAGE_LOCALE_MULTILINGUAL,
				$schemaVersion
			)
		);
		$this->metrics->recordOp( self::METRIC_STORE, 'delete', $success ? 'success' : 'failure', $startTime );
	}
}
