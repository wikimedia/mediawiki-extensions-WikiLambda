<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ParserFunction;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPendingFragment;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\JobQueueGroup;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\WikitextPFragment;
use Wikimedia\Parsoid\Mocks\MockEnv;
use Wikimedia\Parsoid\Wt2Html\TT\TemplateHandlerArguments;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentHandler
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionsClientStore
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
		$mock = $this->createMock( TemplateHandlerArguments::class );
		$mock
			->method( 'getOrderedArgs' )
			->willReturnCallback( static function ( $extApi, $expandAndTrim = true ) use ( $values ) {
				$fragments = [];
				// Mock getOrderedArgs by conditionally trimming the argument depending on $expandAndTrim flag
				foreach ( $values as $i => $value ) {
					$shouldTrim = is_array( $expandAndTrim ) ? ( $expandAndTrim[$i] ?? true ) : $expandAndTrim;
					$fragments[] = WikitextPFragment::newFromWt( ( $shouldTrim ? trim( $value ) : $value ), null );
				}
				return $fragments;
			} );
		return $mock;
	}

	/**
	 * @dataProvider provideWikifunctionsFragments
	 */
	public function testWikifunctionsFragments( $inputArguments, $expectedRequest, $cachedFunction = null ) {
		// Build mock dependencies for Fragment Handler constructor:
		$mainConfig = $this->getServiceContainer()->getMainConfig();
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );

		$mockObjectCache = $this->createMock( BagOStuff::class );
		if ( $cachedFunction !== null ) {
			$mockObjectCache->method( 'get' )->with( 'mock-cache-key' )->willReturn( 'mock-cache-key' );
		}

		$mockClientStore = $this->createMock( WikifunctionsClientStore::class );
		$mockClientStore->method( 'fetchFromZObjectCache' )->with( 'Z10000' )->willReturn( $cachedFunction );
		$mockClientStore->method( 'makeFunctionCallCacheKey' )->willReturn( 'mock-cache-key' );

		$this->setService( 'WikifunctionsClientStore', $mockClientStore );

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
			$mockHttpRequestFactory
		);

		// Build mock arguments for sourceToFragment:
		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		$mockArguments = $this->getMockArguments( $inputArguments );

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
		$this->assertInstanceOf( WikifunctionsClientRequestJob::class, $requestJob );
		$this->assertSame( $expectedRequest, $requestJob->getParams()['request'] );
	}

	public static function provideWikifunctionsFragments() {
		// Simple call to function Join with unnamed arguments:
		// {{#function:Z10000|foo|bar}}
		$simpleJoinArgs = [ 'Z10000', 'foo', 'bar' ];
		$simpleJoinRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'foo',
				'Z10000K2' => 'bar',
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		yield 'normal function call with string arguments' => [ $simpleJoinArgs, $simpleJoinRequest ];

		// Call to function Join with unnamed and named arguments:
		// {{#function:Z10000|foo|bar|parserlang=ast|renderlang=es|foo=bar|1=hello|2=world}}
		$namedArgs = [ 'Z10000', 'foo', 'bar', 'parselang=ast', 'renderlang=es', 'foo=bar', '1=hello', '2=world' ];
		$namedArgsRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'hello',
				'Z10000K2' => 'world',
			],
			'parseLang' => 'ast',
			'renderLang' => 'es',
		];
		yield 'function call with named arguments' => [ $namedArgs, $namedArgsRequest ];

		// Call to function Join with untrimmed and trimmed arguments:
		// {{#function:Z10000|foo|bar| |   }}
		$trimmedArgs = [ 'Z10000', ' foo ', '  bar', ' ', '   ' ];
		$trimmedArgsRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'foo',
				'Z10000K2' => 'bar',
				'Z10000K3' => ' ',
				'Z10000K4' => '   ',
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		yield 'function call with whitespaces' => [ $trimmedArgs, $trimmedArgsRequest ];

		// Call to function Join with empty arguments without default values:
		// {{#function:Z10000||}}
		$emptyArgs = [ 'Z10000', '', '' ];
		$emptyArgsRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => '',
				'Z10000K2' => '',
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		// Empty args: will request function Zid from cache:
		$emptyArgsFunction = [
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z40',
						'Z17K2' => 'Z10000K1'
					],
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z6',
						'Z17K2' => 'Z10000K2'
					]
				]
			]
		];
		yield 'function call with empty arguments' => [
			$emptyArgs,
			$emptyArgsRequest,
			$emptyArgsFunction
		];

		// Call to function Join with empty arguments that have default values:
		// {{#function:Z10000|15-01-2001|}}
		$defaultValuesArgs = [ 'Z10000', '15-01-2001', '' ];
		$today  = new \DateTime( 'now', new \DateTimeZone( 'UTC' ) );
		$defaultValuesRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => '15-01-2001',
				'Z10000K2' => $today->format( 'd-m-Y' )
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		// Empty args: will request function Zid from cache:
		$defaultValuesFunction = [
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z20420',
						'Z17K2' => 'Z10000K1'
					],
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z20420',
						'Z17K2' => 'Z10000K2'
					]
				]
			]
		];
		yield 'function call with empty arguments with default values' => [
			$defaultValuesArgs,
			$defaultValuesRequest,
			$defaultValuesFunction
		];
	}
}
