<?php
/**
 * WikiLambda Abstract Wikipedia - Service class to handle AW Article Section storage.
 *
 * This store provides access to two semantically different objects:
 *
 * * AWSection: identified by the Topic qid, the Section qid, and the locale.
 *   The store contains one row for each Article Section generated for a allowed language.
 *   This is the main object that contains the rendered output that will be concatenated
 *   when displaying an Abstract Wikipedia article.
 *
 * * AWArticleMetadata: identified by the Topic qid.
 *   The store contains one Metadata row for each Article from the allowed topics.
 *   The Metadata object is kept up to date when rendering the article sections, and
 *   provides important information to concatenate Article Sections and build the
 *   final Abstract Wikipedia Article.
 *
 * Both objects are also indexed by a schema version, which can be incremented if any
 * of the payload expectations changes in a non-backwards-compatible way.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

abstract class AWArticleStore {

	public const AW_STORAGE_VIRTUAL_DOMAIN = 'virtual-awstorage';
	public const AW_STORAGE_SCHEMA_VERSION = 1;
	public const AW_STORAGE_METADATA_KEY = '_metadata';
	public const AW_STORAGE_LOCALE_MULTILINGUAL = 'mul';

	/**
	 * Get a specific section for a topic + locale.
	 *
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @param string $locale
	 * @param int $schemaVersion
	 * @return ?AWSection
	 */
	abstract public function getSection(
		string $topicQid,
		string $sectionQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): ?AWSection;

	/**
	 * Get all stored sections for a topic + locale.
	 *
	 * @param string $topicQid
	 * @param string $locale
	 * @param int $schemaVersion
	 * @return AWSection[]
	 */
	abstract public function getSectionsForTopic(
		string $topicQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): array;

	/**
	 * Persist a section.
	 *
	 * @param AWSection $section
	 * @return bool
	 */
	abstract public function setSection( AWSection $section ): bool;

	/**
	 * Delete a section.
	 *
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @param string $locale
	 * @param int $schemaVersion
	 */
	abstract public function deleteSection(
		string $topicQid,
		string $sectionQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): void;

	/**
	 * Get article metadata.
	 *
	 * @param string $topicQid
	 * @param int $schemaVersion
	 * @return ?AWArticleMetadata
	 */
	abstract public function getArticleMetadata(
		string $topicQid,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): ?AWArticleMetadata;

	/**
	 * Persist article metadata.
	 *
	 * @param AWArticleMetadata $metadata
	 * @return bool
	 */
	abstract public function setArticleMetadata( AWArticleMetadata $metadata ): bool;

	/**
	 * Static method to create a placeholder section HTML payload
	 * when a requested section + topic + locale has not yet been
	 * generated. This blob will be shown to indicate to the reader
	 * that something should be displayed there but is not yet ready.
	 * Additional information can also be shared (to discuss).
	 *
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @param string $locale
	 */
	public static function createMissingSectionBlock(
		string $topicQid,
		string $sectionQid,
		string $locale,
	): AWSection {
		return new AWSection(
			$topicQid,
			$sectionQid,
			$locale,
			'<div class="aw-section-missing">Section not yet generated</div>',
		);
	}
}
