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

	private ConvertibleTimestamp $lastUpdated;

	public function __construct(
		private readonly string $topicQid,
		private readonly array $payload,
		?ConvertibleTimestamp $lastUpdated = null,
		private readonly int $schemaVersion = AWArticleStore::AW_STORAGE_SCHEMA_VERSION
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
	 * Keys touched on AbstractWikiContent update:
	 * * sections: [ sectionIndex => sectionQid ]
	 * * awLastUpdated: time of latest revision
	 * * awLatestRevID: ID of latest revision
	 *
	 * Keys touched on AbstractWikiContent delete:
	 * * awDeleted: time of the content deletion
	 *
	 * Keys touched on updateAbstractWikiArticleStore:
	 * * sections: [ sectionIndex => sectionQid ]
	 * * pendingSections: [ locale => [ sectionQids ] ]
	 * * lastRendered: time of the latest re-render
	 *
	 * @return array
	 */
	public function getPayload(): array {
		return $this->payload;
	}

	/**
	 * Returns the section QIDs ordered by their section index.
	 *
	 * @return string[]
	 */
	public function getSectionQids(): array {
		$sections = $this->payload[ 'sections' ] ?? [];

		if ( !is_array( $sections ) ) {
			return [];
		}

		// Sort by numeric index keys
		ksort( $sections, SORT_NUMERIC );

		// Return ordered QIDs only
		return array_values( $sections );
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
