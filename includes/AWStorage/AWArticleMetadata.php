<?php
/**
 * WikiLambda Abstract Wikipedia Section Store: AWArticleMetadata Object
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use Wikimedia\Timestamp\ConvertibleTimestamp;

class AWArticleMetadata {

	private int $schemaVersion;
	private ConvertibleTimestamp $lastUpdated;

	public function __construct(
		public readonly string $topicQid,
		public readonly array $payload,
		?ConvertibleTimestamp $lastUpdated = null,
		int $schemaVersion = AWArticleStore::AW_STORAGE_SCHEMA_VERSION
	) {
		$this->lastUpdated = $lastUpdated ?? new ConvertibleTimestamp();
		$this->schemaVersion = $schemaVersion;
	}

	/**
	 * Returns the Wikidata QID that identifies this AW Article.
	 * E.g. Q42 for Douglas Adams
	 *
	 * @return string
	 */
	public function getTopicQid(): string {
		return $this->topicQid;
	}

	/**
	 * Returns the Timestamp for the latest update.
	 *
	 * @see https://www.mediawiki.org/wiki/Timestamp
	 * @return ConvertibleTimestamp
	 */
	public function getLastUpdated(): ConvertibleTimestamp {
		return $this->lastUpdated;
	}

	/**
	 * Returns the payload stored for this AW Article Metadata, which
	 * contains an encoded JSON with the necessary schema (version 1).
	 *
	 * TODO: Agree on metadata JSON schema, what keys are needed, method
	 * of validation, serialization, granular getters and setters, etc.
	 *
	 * @return array
	 */
	public function getPayload(): array {
		return $this->payload;
	}

	/**
	 * Returns the current schema version for this object.
	 *
	 * NOTE: or future schema updates, schema versioning can be adapted
	 * to be externally configurable. Currently schemaVersion is hardcoded
	 * in the AWArticleStore::AW_STORAGE_SCHEMA_VERSION constant.
	 *
	 * @return int
	 */
	public function getSchemaVersion(): int {
		return $this->schemaVersion;
	}
}
