<?php
/**
 * WikiLambda Data Access Object service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IConnectionProvider;

class WikifunctionsClientStore {

	private IConnectionProvider $dbProvider;

	public const INSTANCEOFENUM = 'instanceofenum';

	/**
	 * @param IConnectionProvider $dbProvider
	 */
	public function __construct( IConnectionProvider $dbProvider ) {
		$this->dbProvider = $dbProvider;
	}

	public function insertWikifunctionsUsage( string $targetFunction, Title $targetPage ): bool {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikifunctionsclient_usage' )
			->row( [
				'wfcu_targetPage' => $targetPage->getDBkey(),
				'wfcu_targetFunction' => $targetFunction,
			] )
			->set( [
				'wfcu_targetFunction' => $targetFunction,
			] )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [
				'wfcu_targetPage',
				'wfcu_targetFunction',
			] )
			// We don't mind duplicates (i.e., the same Function is used twice on the same page)
			->ignore()
			->caller( __METHOD__ )->execute();

		return (bool)$dbw->affectedRows();
	}

	public function fetchWikifunctionsUsage( string $targetFunction ): array {
		$dbr = $this->dbProvider->getReplicaDatabase();
		return $dbr->newSelectQueryBuilder()
			->select( 'wfcu_targetPage' )
			->from( 'wikifunctionsclient_usage' )
			->where( [ 'wfcu_targetFunction' => $targetFunction ] )
			->caller( __METHOD__ )
			->fetchFieldValues();
	}

	public function deleteWikifunctionsUsage( Title $targetPage ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikifunctionsclient_usage' )
			->where( [ 'wfcu_targetPage' => $targetPage->getDBkey() ] )
			->caller( __METHOD__ )->execute();
	}
}
