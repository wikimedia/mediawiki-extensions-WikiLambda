<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction
 * @group API
 * @group Database
 */
class UpdateImplementationsJobTest extends WikiLambdaIntegrationTestCase {

	private ZObjectStore $store;

	protected function setUp(): void {
		parent::setUp();

		$this->store = WikiLambdaServices::getZObjectStore();
	}

	public function addDBData() {
		$this->insertZids( [ 'Z14', 'Z16', 'Z17', 'Z20', 'Z40', 'Z61', 'Z813', 'Z8130', 'Z8131', 'Z913' ] );
	}

	public function testRun() {
		$functionZid = 'Z813';
		$targetTitle = Title::newFromText( $functionZid, NS_MAIN );
		$functionRevision_1 = $targetTitle->getLatestRevID();

		// 1. Insert an initial ranking of 3 implementations
		// 'Z91301' and 'Z91302' don't exist, but it doesn't matter for this test
		$implementationRanking = [ new ZReference( 'Z913' ),
			new ZReference( 'Z91301' ), new ZReference( 'Z91302' ) ];
		$this->updateImplementationsList( $functionZid, $targetTitle, $implementationRanking );
		$functionRevision_2 = $targetTitle->getLatestRevID();
		$this->assertTrue( $functionRevision_2 > $functionRevision_1 );

		// 2. Run the job code by directly calling ->run() (not using the queue),
		//    with a different ranking
		$implementationRankingZids = [ 'Z91301', 'Z913', 'Z91302' ];
		$updateImplementationsJob = new UpdateImplementationsJob(
			[ 'functionZid' => $functionZid,
				'functionRevision' => $functionRevision_2,
				'implementationRankingZids' => $implementationRankingZids
			] );

		$execStatus = $updateImplementationsJob->run();
		$this->assertTrue( $execStatus );
		$functionRevision_3 = $targetTitle->getLatestRevID();
		$this->assertTrue( $functionRevision_3 > $functionRevision_2 );

		// 3.  Update with a 3rd ranking, this time using a job queue
		$implementationRankingZids = [ 'Z91302', 'Z913', 'Z91301' ];
		$updateImplementationsJob = new UpdateImplementationsJob(
			[ 'functionZid' => $functionZid,
				'functionRevision' => $functionRevision_3,
				'implementationRankingZids' => $implementationRankingZids
			] );

		$jobQueueGroup = $this->getServiceContainer()->getJobQueueGroup();
		$jobQueueGroup->push( $updateImplementationsJob );

		// At this point, we have 1 job scheduled for this job type.
		$this->assertSame( 1, $jobQueueGroup->getQueueSizes()[ 'updateImplementations' ] );
		// Force the job to run now
		$this->runJobs( [ 'maxJobs' => 1 ], [ 'type' => 'updateImplementations' ] );
		// At this point, we have 0 jobs scheduled for this job type.
		$this->assertSame( 0, $jobQueueGroup->getQueueSizes()['updateImplementations'] );
		$functionRevision_4 = $targetTitle->getLatestRevID();
		$this->assertTrue( $functionRevision_4 > $functionRevision_3 );

		// Retrieve Z8K4/implementations (as ZIDs) and confirm correct
		$targetObject = $this->store->fetchZObjectByTitle( $targetTitle );
		$targetFunction = $targetObject->getInnerZObject();
		$targetImplementationZids = $targetFunction->getImplementationZids();
		$this->assertTrue( $targetImplementationZids === $implementationRankingZids );

		// 4. Update with a 4th ranking, again using job queue, but containing different elements
		// than are currently in persistent storage. Because the elements are different, there
		// should be no update.
		// Here we pretend that a different activity caused the persisted implementations to
		// change, resulting in $functionRevision_4.  We pretend that $functionRevision_3 was the
		// one detected by the caller of this job.
		$implementationRankingZids = [ 'Z91302', 'Z913', 'Z91303' ];
		$updateImplementationsJob = new UpdateImplementationsJob(
			[ 'functionZid' => $functionZid,
				'functionRevision' => $functionRevision_3,
				'implementationRankingZids' => $implementationRankingZids
			] );

		$jobQueueGroup->push( $updateImplementationsJob );

		$this->assertSame( 1, $jobQueueGroup->getQueueSizes()[ 'updateImplementations' ] );
		// Force the job to run now
		$this->runJobs( [ 'maxJobs' => 1 ], [ 'type' => 'updateImplementations' ] );
		$this->assertSame( 0, $jobQueueGroup->getQueueSizes()[ 'updateImplementations' ] );
		$functionRevision_5 = $targetTitle->getLatestRevID();
		$this->assertTrue( $functionRevision_5 === $functionRevision_4 );
	}

	/**
	 * @param string $functionZid
	 * @param Title $targetTitle
	 * @param array $newList
	 */
	private function updateImplementationsList( $functionZid, $targetTitle, $newList ) {
		$targetObject = $this->store->fetchZObjectByTitle( $targetTitle );
		$targetFunction = $targetObject->getInnerZObject();

		// Update ZFunction with the new ranking
		$targetFunction->setValueByKey(
			ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
			new ZTypedList(
				ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
				$newList
			)
		);
		// Update persistent storage
		$creatingComment = wfMessage( 'wikilambda-updated-implementations-summary' )
			->inLanguage( 'en' )->text();
		$this->store->updateZObjectAsSystemUser(
			RequestContext::getMain(),
			$functionZid,
			$targetObject->getZObject()->__toString(),
			$creatingComment
		);
	}
}
