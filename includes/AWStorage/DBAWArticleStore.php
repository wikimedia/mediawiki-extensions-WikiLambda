<?php
/**
 * WikiLambda RDBMS implementation of AWArticleStore
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IDatabase;
use Wikimedia\Rdbms\IReadableDatabase;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class DBAWArticleStore extends AWArticleStore {

	/**
	 * @param IConnectionProvider $dbProvider
	 */
	public function __construct(
		private readonly IConnectionProvider $dbProvider
	) {
		// Nothing to do here
	}

	private function getReplicaDB(): IReadableDatabase {
		return $this->dbProvider->getReplicaDatabase( self::AW_STORAGE_VIRTUAL_DOMAIN );
	}

	private function getPrimaryDB(): IDatabase {
		return $this->dbProvider->getPrimaryDatabase( self::AW_STORAGE_VIRTUAL_DOMAIN );
	}

	/**
	 * @param string $ts
	 * @return ConvertibleTimestamp
	 */
	private function getTimestamp( string $ts ): ConvertibleTimestamp {
		return new ConvertibleTimestamp( $ts );
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
		$dbr = $this->getReplicaDB();

		$row = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => $topicQid,
				'awas_section_qid' => $sectionQid,
				$dbr->expr( 'awas_section_qid', '!=', self::AW_STORAGE_METADATA_KEY ),
				'awas_locale' => $locale,
				'awas_schema_version' => $schemaVersion
			] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$row ) {
			return null;
		}

		return new AWSection(
			$row->awas_topic_qid,
			$row->awas_section_qid,
			$row->awas_locale,
			$row->awas_payload,
			$this->getTimestamp( $row->awas_last_updated ),
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getSectionsForTopic(
		string $topicQid,
		string $locale,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): array {
		$dbr = $this->getReplicaDB();

		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => $topicQid,
				$dbr->expr( 'awas_section_qid', '!=', self::AW_STORAGE_METADATA_KEY ),
				'awas_locale' => $locale,
				'awas_schema_version' => $schemaVersion
			] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$out = [];

		foreach ( $res as $row ) {
			$out[] = new AWSection(
				$row->awas_topic_qid,
				$row->awas_section_qid,
				$row->awas_locale,
				$row->awas_payload,
				$this->getTimestamp( $row->awas_last_updated ),
			);
		}

		return $out;
	}

	/**
	 * @inheritDoc
	 */
	public function setSection( AWSection $section ): bool {
		$dbw = $this->getPrimaryDB();

		// TODO last_updated to be the time the row is set, or should it be
		// the time that it was "rendered", which we would somehow calculate
		// from the rendering times from the fragments?
		$now = ConvertibleTimestamp::now();

		$dbw->newReplaceQueryBuilder()
			->replaceInto( 'aw_article_sections' )
			->uniqueIndexFields( [
				'awas_topic_qid',
				'awas_section_qid',
				'awas_locale',
				'awas_schema_version'
			] )
			->row( [
				'awas_topic_qid' => $section->getTopicQid(),
				'awas_section_qid' => $section->getSectionQid(),
				'awas_locale' => $section->getLocale(),
				'awas_schema_version' => $section->getSchemaVersion(),
				'awas_last_updated' => $now,
				'awas_payload' => $section->getPayload(),
			] )
			->caller( __METHOD__ )
			->execute();

		return true;
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
		$dbw = $this->getPrimaryDB();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => $topicQid,
				'awas_section_qid' => $sectionQid,
				'awas_locale' => $locale,
				'awas_schema_version' => $schemaVersion
			] )
			->caller( __METHOD__ )
			->execute();
	}

	/**
	 * @inheritDoc
	 */
	public function getArticleMetadata(
		string $topicQid,
		int $schemaVersion = self::AW_STORAGE_SCHEMA_VERSION
	): ?AWArticleMetadata {
		$dbr = $this->getReplicaDB();

		$row = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => $topicQid,
				'awas_section_qid' => self::AW_STORAGE_METADATA_KEY,
				'awas_locale' => self::AW_STORAGE_LOCALE_MULTILINGUAL,
				'awas_schema_version' => $schemaVersion
			] )
			->caller( __METHOD__ )
			->fetchRow();

		if ( !$row ) {
			return null;
		}

		return new AWArticleMetadata(
			$row->awas_topic_qid,
			json_decode( $row->awas_payload, true ) ?? [],
			$this->getTimestamp( $row->awas_last_updated )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function setArticleMetadata( AWArticleMetadata $metadata ): bool {
		$dbw = $this->getPrimaryDB();

		$now = ConvertibleTimestamp::now();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'aw_article_sections' )
			->row( [
				'awas_topic_qid' => $metadata->getTopicQid(),
				'awas_section_qid' => self::AW_STORAGE_METADATA_KEY,
				'awas_locale' => self::AW_STORAGE_LOCALE_MULTILINGUAL,
				'awas_schema_version' => self::AW_STORAGE_SCHEMA_VERSION,
				'awas_payload' => json_encode( $metadata->getPayload() ),
				'awas_last_updated' => $now
			] )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [
				'awas_topic_qid',
				'awas_section_qid',
				'awas_locale',
				'awas_schema_version'
			] )
			->set( [
				'awas_payload' => json_encode( $metadata->getPayload() ),
				'awas_last_updated' => $now
			] )
			->caller( __METHOD__ )
			->execute();

		return true;
	}
}
