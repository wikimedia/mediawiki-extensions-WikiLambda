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
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Registration\ExtensionRegistry;
use Wikibase\Client\Store\ClientStore;
use Wikibase\Client\Usage\UsageAccumulator;
use Wikibase\Client\Usage\UsageAccumulatorFactory;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\Lib\Store\SiteLinkLookup;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\HtmlPFragment;
use Wikimedia\Parsoid\Fragments\WikitextPFragment;
use Wikimedia\Parsoid\Mocks\MockEnv;
use Wikimedia\Parsoid\Wt2Html\TT\TemplateHandlerArguments;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentHandler
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentSanitiserTokenHandler
 * @covers \MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsCallDefaultValues
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionsClientStore
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
	 * @param string $item
	 */
	protected function mockWikibaseClientServices( $item ) {
		$itemId = new ItemId( $item );

		$mockSiteLinkLookup = $this->createMock( SiteLinkLookup::class );
		$mockSiteLinkLookup
			->method( 'getItemIdForLink' )
			->willReturn( $itemId );

		$mockWikibaseClientStore = $this->createMock( ClientStore::class );
		$mockWikibaseClientStore
			->method( 'getSiteLinkLookup' )
			->willReturn( $mockSiteLinkLookup );

		$mockUsageAccumulator = $this->createMock( UsageAccumulator::class );
		$mockUsageAccumulator->method( 'addAllUsage' );

		$mockUsageAccumulatorFactory = $this->createMock( UsageAccumulatorFactory::class );
		$mockUsageAccumulatorFactory
			->method( 'newFromParserOutputProvider' )
			->willReturn( $mockUsageAccumulator );

		$mockEntityIdParser = $this->createMock( EntityIdParser::class );
		$mockEntityIdParser
			->method( 'parse' )
			->willReturnMap( [ [ $item, $itemId ] ] );

		// Wire mock services
		$this->setService( 'WikibaseClient.Store', $mockWikibaseClientStore );
		$this->setService( 'WikibaseClient.UsageAccumulatorFactory', $mockUsageAccumulatorFactory );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );
	}

	/**
	 * @dataProvider provideWikifunctionsFragments
	 */
	public function testWikifunctionsFragments(
		$inputArguments,
		$expectedRequest,
		$cachedFunction = null,
		$linkedItem = null
	) {
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

		if ( $linkedItem ) {
			if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
				$this->markTestSkipped( 'WikibaseClient extension is not loaded' );
			}

			$this->mockWikibaseClientServices( $linkedItem );
		}

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
		$this->assertSame( $inputArguments[0], $updateJob->getParams()['targetFunction'] );

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

		// Function call with Wikidata item reference arguments:
		// {{#function:Z6801|Q1|Q2}}
		$itemRefArgs = [ 'Z6801', 'Q1', 'Q2' ];
		$itemRefRequest = [
			'target' => 'Z6801',
			'arguments' => [
				'Z6801K1' => 'Q1',
				'Z6801K2' => 'Q2'
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		yield 'Function call with Wikidata item reference arguments' => [ $itemRefArgs, $itemRefRequest ];

		// Function call with Wikidata lexeme reference arguments:
		// {{#function:Z6805|L1234|L5678}}
		$lexemeRefArgs = [ 'Z6805', 'L1234', 'L5678' ];
		$lexemeRefRequest = [
			'target' => 'Z6805',
			'arguments' => [
				'Z6805K1' => 'L1234',
				'Z6805K2' => 'L5678'
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		yield 'Function call with Wikidata lexeme reference arguments' => [ $lexemeRefArgs, $lexemeRefRequest ];

		// Function call with empty Wikidata item arguments:
		// {{#function:Z10000||}}
		$linkedItem = 'Q1';
		$defaultItemArgs = [ 'Z10000', '', '' ];
		$defaultItemRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => $linkedItem,
				'Z10000K2' => $linkedItem
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		// Empty args: will request function Zid from cache:
		$defaultItemFunction = [
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z6001',
						'Z17K2' => 'Z10000K1'
					],
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z6091',
						'Z17K2' => 'Z10000K2'
					]
				]
			]
		];
		yield 'Function call with empty Wikidata item arguments' => [
			$defaultItemArgs,
			$defaultItemRequest,
			$defaultItemFunction,
			$linkedItem
		];
	}

	public function testReturnsHtmlFragmentWhenOutputTypeIsZ89() {
		// Force-enable HTML output:
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', true );

		$mainConfig = $this->getServiceContainer()->getMainConfig();
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );

		$mockClientStore = $this->createMock( WikifunctionsClientStore::class );
		$mockClientStore->method( 'makeFunctionCallCacheKey' )->willReturn( 'mock-cache-key' );
		$mockClientStore->method( 'fetchFromFunctionCallCache' )->willReturn( [
			'success' => true,
			'type' => ZTypeRegistry::Z_HTML_FRAGMENT,
			'value' => '
				<b data-mw="This is a bad vector!" data-mw-foo="No, really!">HTML!</b><script>alert("x")</script>
				<a href="https://af.wikipedia.org/wiki/Eenhoring" data-mw="Corruption!">Wikipedia link</a>
				<script>setTimeout(function(){window.alert(\'I killed visual editor\')},10000);</script>
				<button type="button" data-ooui="Fiddles!">inject buttons</button><br/>
				<iframe
				  width="560"
				  height="315"
				  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
				  title="YouTube video player"
				  frameborder="0"
				  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				  allowfullscreen>
				</iframe><br/>
				<img src="x" onerror="alert(\'XSS1\')"><br/>
				<a href="javascript:alert(\'XSS2\')">Click me</a><br/>
				<div style="background-image: url(javascript:alert(\'XSS3\'))">Test</div><br/>
				<span style="background:#4caf50;color:white;padding:2px 6px;border-radius:4px;font-size:90%">'
				. 'inline style galore</span><br/>
				<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/'
				. 'Dabin-Unicorn-Main-Product-Image.jpg/1200px-Dabin-Unicorn-Main-Product-Image.jpg" alt="unicorns"/>
			'
		] );
		$this->setService( 'WikifunctionsClientStore', $mockClientStore );

		$mockJobQueueGroup = $this->createMock( JobQueueGroup::class );
		$fragmentHandler = new WikifunctionsPFragmentHandler(
			$mainConfig,
			$mockJobQueueGroup,
			$mockHttpRequestFactory
		);

		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		$mockArguments = $this->getMockArguments( [ 'Z10000', 'foo' ] );

		$fragment = $fragmentHandler->sourceToFragment(
			$extApi,
			$mockArguments,
			false
		);

		$this->assertInstanceOf( HtmlPFragment::class, $fragment );
		$html = $fragment->asHtmlString( $extApi );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '<b>HTML!</b>', $html );
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString(
			'&lt;script&gt;alert("x")&lt;/script&gt;',
			$html
		);
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString(
			'&lt;a href="https://af.wikipedia.org/wiki/Eenhoring" data-mw="Corruption!"&gt;Wikipedia link&lt;/a&gt;',
			$html
		);
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString(
			'&lt;script&gt;setTimeout(function(){window.alert(\'I killed visual editor\')},10000);&lt;/script&gt;',
			$html
		);
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString(
			'&lt;button type="button" data-ooui="Fiddles!"&gt;inject buttons&lt;/button&gt;',
			$html
		);
		// @phpcs:ignore Generic.Files.LineLength.TooLong
		$this->assertStringContainsString( '&lt;iframe', $html );
		$this->assertStringContainsString( '&lt;img src="x" onerror="alert(\'XSS1\')"&gt;', $html );
		$this->assertStringContainsString( '&lt;a href="javascript:alert(\'XSS2\')"&gt;Click me&lt;/a&gt;', $html );
		$this->assertStringContainsString( '<div>Test</div>', $html );
		$this->assertStringContainsString(
			'<span style="background:#4caf50;color:white;padding:2px 6px;border-radius:4px;'
			. 'font-size:90%">inline style galore</span>',
			$html
		);
		$this->assertStringContainsString(
			'&lt;img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/'
			. 'Dabin-Unicorn-Main-Product-Image.jpg/1200px-Dabin-Unicorn-Main-Product-Image.jpg" alt="unicorns"/&gt;',
			$html
		);
	}

	public function testReturnsErrorWhenHtmlOutputDisabled() {
		// Force-disable HTML output:
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', false );

		$mainConfig = $this->getServiceContainer()->getMainConfig();
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );

		$mockClientStore = $this->createMock( WikifunctionsClientStore::class );
		$mockClientStore->method( 'makeFunctionCallCacheKey' )->willReturn( 'mock-cache-key' );
		$mockClientStore->method( 'fetchFromFunctionCallCache' )->willReturn( [
			'success' => true,
			'type' => ZTypeRegistry::Z_HTML_FRAGMENT,
			'value' => '<b>HTML!</b>'
		] );
		$this->setService( 'WikifunctionsClientStore', $mockClientStore );

		$mockJobQueueGroup = $this->createMock( JobQueueGroup::class );
		$fragmentHandler = new WikifunctionsPFragmentHandler(
			$mainConfig,
			$mockJobQueueGroup,
			$mockHttpRequestFactory
		);

		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		$mockArguments = $this->getMockArguments( [ 'Z10000', 'foo' ] );

		$fragment = $fragmentHandler->sourceToFragment(
			$extApi,
			$mockArguments,
			false
		);

		// Should return an errorful fragment
		$this->assertInstanceOf( HtmlPFragment::class, $fragment );
		$html = $fragment->asHtmlString( $extApi );
		$this->assertStringContainsString(
			'wikilambda-functioncall-error-nonstringoutput',
			$html
		);
		$this->assertStringContainsString(
			'Content error',
			$html
		);
		$this->assertStringContainsString(
			'<span class="cdx-info-chip',
			$html
		);
	}
}
