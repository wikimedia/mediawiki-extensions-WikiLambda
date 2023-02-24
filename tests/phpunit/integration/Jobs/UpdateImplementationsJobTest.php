<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\API\ApiPerformTest;
use MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob
 * @group API
 * @group Database
 * @group medium
 */
class UpdateImplementationsJobTest extends WikiLambdaIntegrationTestCase {

	/** @var ZObjectStore */
	protected $store;

	private function insertBuiltinObjects( $zids ): void {
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';
		foreach ( $zids as $zid ) {
			$data = file_get_contents( "$dataPath/$zid.json" );
			$this->editPage( $zid, $data, '', NS_MAIN );
		}
	}

	protected function setUp(): void {
		parent::setUp();

		$this->store = WikiLambdaServices::getZObjectStore();
	}

	public function addDBData() {
		$this->insertBuiltinObjects( [ 'Z14', 'Z16', 'Z17', 'Z20', 'Z40', 'Z61', 'Z813', 'Z8130', 'Z8131', 'Z913' ] );
	}

	/**
	 * @group API
	 * @group Database
	 * @group medium
	 * @covers \MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiPerformTest::getImplementationZids
	 */
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
		$targetImplementationZids = ApiPerformTest::getImplementationZids( $targetFunction );
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
		$this->store->updateZObjectAsSystemUser( $functionZid, $targetObject->getZObject()->__toString(),
			$creatingComment );
	}
}
