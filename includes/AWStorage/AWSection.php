<?php
/**
 * WikiLambda Abstract Wikipedia Section Store: AWSection Object
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use Wikimedia\Timestamp\ConvertibleTimestamp;

class AWSection {

	private ConvertibleTimestamp $lastUpdated;

	public function __construct(
		private readonly string $topicQid,
		private readonly string $sectionQid,
		private readonly string $locale,
		private readonly string $payload,
		?ConvertibleTimestamp $lastUpdated = null,
		private readonly int $schemaVersion = AWArticleStore::AW_STORAGE_SCHEMA_VERSION,
	) {
		$this->lastUpdated = $lastUpdated ?? new ConvertibleTimestamp();
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
	 * Returns the Wikidata QID that identifies this AW Article Section.
	 * E.g. Q8776414 for Lede
	 *
	 * @return string
	 */
	public function getSectionQid(): string {
		return $this->sectionQid;
	}

	/**
	 * Returns the MediaWiki's BCP-47 locale identifier.
	 * E.g. es-mx
	 *
	 * @return string
	 */
	public function getLocale(): string {
		return $this->locale;
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
	 * Returns the payload stored for this AW Article Section, which
	 * contains an HTML blob with the output of the Section pre-generation
	 * maintenance script (for schema version 1)
	 *
	 * @return string
	 */
	public function getPayload(): string {
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
