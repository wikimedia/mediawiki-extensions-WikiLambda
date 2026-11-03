<?php
/**
 * WikiLambda cross-wiki Abstract Wikipedia render status Data Access Object service
 *
 * Writes the shared `abstractwiki_render_status` table, which records how many fragments
 * of each stored article section are pending or failed, per language. The table lives on
 * the shared x1 cluster via the 'virtual-abstractwiki' virtual domain.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\IDatabase;

class AWRenderStatusStore {

	public const VIRTUAL_DOMAIN = 'virtual-abstractwiki';

	public function __construct(
		private readonly IConnectionProvider $dbProvider
	) {
	}

	private function getPrimaryDB(): IDatabase {
		return $this->dbProvider->getPrimaryDatabase( self::VIRTUAL_DOMAIN );
	}

	/**
	 * Record the status of a section as it is now stored.
	 *
	 * @param AWSection $section
	 * @param string $timestamp When the section was stored, in any format ConvertibleTimestamp takes
	 */
	public function setStatus( AWSection $section, string $timestamp ): void {
		$fragmentStatus = $section->getFragmentStatus();
		$counts = [
			'awr_fragments' => $section->getFragmentCount(),
			'awr_pending' => $fragmentStatus['pending'],
			'awr_failed' => $fragmentStatus['failed'],
		];

		$dbw = $this->getPrimaryDB();
		$counts['awr_rendered'] = $dbw->timestamp( $timestamp );
		$dbw->newInsertQueryBuilder()
			->insertInto( 'abstractwiki_render_status' )
			->row( [
				'awr_topic' => $section->getTopicQid(),
				'awr_section' => $section->getSectionQid(),
				'awr_lang' => $section->getLocale(),
			] + $counts )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [ 'awr_topic', 'awr_lang', 'awr_section' ] )
			->set( $counts )
			->caller( __METHOD__ )->execute();
	}

	/**
	 * Remove the status of a section that is no longer stored.
	 *
	 * @param string $topicQid
	 * @param string $sectionQid
	 * @param string $locale
	 */
	public function deleteStatus( string $topicQid, string $sectionQid, string $locale ): void {
		$this->getPrimaryDB()->newDeleteQueryBuilder()
			->deleteFrom( 'abstractwiki_render_status' )
			->where( [ 'awr_topic' => $topicQid, 'awr_section' => $sectionQid, 'awr_lang' => $locale ] )
			->caller( __METHOD__ )->execute();
	}
}
