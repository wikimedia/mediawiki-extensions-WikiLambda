<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPendingFragment;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\JobQueueGroup;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\WikitextPFragment;
use Wikimedia\Parsoid\Mocks\MockEnv;
use Wikimedia\Parsoid\Wt2Html\TT\TemplateHandlerArguments;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentHandler
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionCallDefaultValues
 * @group API
 * @group Database
 */
class WikifunctionsPFragmentHandlerTest extends WikiLambdaClientIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
	}

	/**
	 * @param array $values
	 */
	protected function getMockArguments( $values ): TemplateHandlerArguments {
		$fragments = [];
		foreach ( $values as $value ) {
			$fragments[] = WikitextPFragment::newFromWt( $value, null );
		}
		$mock = $this->createMock( TemplateHandlerArguments::class );
		$mock->method( 'getOrderedArgs' )->willReturn( $fragments );
		return $mock;
	}

	public function testWikifunctionsFragment() {
		// Build mock dependencies for Fragment Handler constructor:
		$mainConfig = $this->getServiceContainer()->getMainConfig();
		$mockObjectCache = $this->createMock( BagOStuff::class );
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );

		$pushedJobs = [];
		$mockJobQueueGroup = $this->createMock( JobQueueGroup::class );
		$mockJobQueueGroup
			->method( 'lazyPush' )
			->willReturnCallback( static function ( $job ) use ( &$pushedJobs ) {
				$pushedJobs[] = $job;
				return true;
			} );

		// Build Fragment Handler:
		$fragmentHandler = new WikifunctionsPFragmentHandler(
			$mainConfig,
			$mockJobQueueGroup,
			$mockHttpRequestFactory,
			$mockObjectCache
		);

		// Build mock arguments for sourceToFragment:
		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		$mockArguments = $this->getMockArguments( [ 'Z10000', 'foo', 'bar' ] );

		// Call sourceToFragment:
		$fragment = $fragmentHandler->sourceToFragment(
			$extApi,
			$mockArguments,
			false
		);

		$this->assertInstanceOf( WikifunctionsPendingFragment::class, $fragment );

		// Assert two jobs were pushed
		$this->assertCount( 2, $pushedJobs );

		// Assert client usage update job
		$updateJob = $pushedJobs[0];
		$this->assertInstanceOf( WikifunctionsClientUsageUpdateJob::class, $updateJob );
		$this->assertSame( 'Z10000', $updateJob->getParams()['targetFunction'] );

		// Assert client request job
		$requestJob = $pushedJobs[1];
		$expectedRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'foo',
				'Z10000K2' => 'bar',
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		$this->assertInstanceOf( WikifunctionsClientRequestJob::class, $requestJob );
		$this->assertSame( $expectedRequest, $requestJob->getParams()['request'] );
	}

	public function testWikifunctionsFragment_defaultDate() {
		// Build mock dependencies for Fragment Handler constructor:
		$mainConfig = $this->getServiceContainer()->getMainConfig();

		$functionObject = [
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z20420',
						'Z17K2' => 'Z20000K1'
					],
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z20420',
						'Z17K2' => 'Z20000K2'
					],
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z6',
						'Z17K2' => 'Z20000K3'
					]
				]
			]
		];

		// Mock cache request
		$mockObjectCache = $this->createMock( BagOStuff::class );
		$mockObjectCache->method( 'makeKey' )->willReturn( 'mock-cache-key' );
		$mockObjectCache->method( 'get' )->with( 'mock-cache-key' )->willReturn( json_encode( $functionObject ) );

		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );
		$pushedJobs = [];
		$mockJobQueueGroup = $this->createMock( JobQueueGroup::class );
		$mockJobQueueGroup
			->method( 'lazyPush' )
			->willReturnCallback( static function ( $job ) use ( &$pushedJobs ) {
				$pushedJobs[] = $job;
				return true;
			} );

		// Build Fragment Handler:
		$fragmentHandler = new WikifunctionsPFragmentHandler(
			$mainConfig,
			$mockJobQueueGroup,
			$mockHttpRequestFactory,
			$mockObjectCache
		);

		// Build mock arguments for sourceToFragment:
		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		$mockArguments = $this->getMockArguments( [ 'Z20000', '15-01-2001', '', '' ] );

		// Call sourceToFragment:
		$fragment = $fragmentHandler->sourceToFragment(
			$extApi,
			$mockArguments,
			false
		);

		$this->assertInstanceOf( WikifunctionsPendingFragment::class, $fragment );

		// Assert two jobs were pushed
		$this->assertCount( 2, $pushedJobs );

		// Assert client usage update job
		$updateJob = $pushedJobs[0];
		$this->assertInstanceOf( WikifunctionsClientUsageUpdateJob::class, $updateJob );
		$this->assertSame( 'Z20000', $updateJob->getParams()['targetFunction'] );

		// Assert client request job
		$requestJob = $pushedJobs[1];
		$today  = new \DateTime( 'now', new \DateTimeZone( 'UTC' ) );

		// Expect:
		// Z20000K2 of type Z20420: set to today's date
		// Z20000K3 of type Z0: no default value
		$expectedRequest = [
			'target' => 'Z20000',
			'arguments' => [
				'Z20000K1' => '15-01-2001',
				'Z20000K2' => $today->format( 'd-m-Y' ),
				'Z20000K3' => ''
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		$this->assertInstanceOf( WikifunctionsClientRequestJob::class, $requestJob );
		$this->assertSame( $expectedRequest, $requestJob->getParams()['request'] );
	}
}
