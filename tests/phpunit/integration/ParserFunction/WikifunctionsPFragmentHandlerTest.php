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
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\HtmlPFragment;
use Wikimedia\Parsoid\Fragments\LiteralStringPFragment;
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

		// Assert that the page properties are set on the page by the fragment handler
		$this->assertSame(
			1, $extApi->getMetadata()->getPageProperty( 'wikilambda' ),
			'Usage on the page should be tracked'
		);
		$this->assertSame(
			1, $extApi->getMetadata()->getPageProperty( 'wikilambda-' . $inputArguments[0] ),
			'Usage of the target function should be tracked'
		);

		// Assert that the reference RL modules are set on the page by the fragment handler
		$this->assertArrayContains(
			[ 'ext.wikilambda.references' ], $extApi->getMetadata()->getModules(),
			'We register ext.wikilambda.references for pages with our fragment; make sure that\'s set'
		);
		$this->assertArrayContains(
			[ 'ext.wikilambda.references.styles' ], $extApi->getMetadata()->getModuleStyles(),
			'We register ext.wikilambda.references.styles for pages with our fragment; make sure that\'s set'
		);
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
		// {{#function:Z10000|foo|bar|parserlang=ext|renderlang=es|foo=bar|1=hello|2=world}}
		$namedArgs = [ 'Z10000', 'foo', 'bar', 'parselang=ext', 'renderlang=es', 'foo=bar', '1=hello', '2=world' ];
		$namedArgsRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'hello',
				'Z10000K2' => 'world',
			],
			'parseLang' => 'ext',
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

		// Function call with empty Natural language argument:
		// {{#function:Z10000|}}
		$defaultLangArgs = [ 'Z10000', '' ];
		$defaultLangRequest = [
			'target' => 'Z10000',
			'arguments' => [
				'Z10000K1' => 'en'
			],
			'parseLang' => 'en',
			'renderLang' => 'en',
		];
		// Empty args: will request function Zid from cache:
		$defaultLangFunction = [
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[
						'Z1K1' => 'Z17',
						'Z17K1' => 'Z60',
						'Z17K2' => 'Z10000K1'
					]
				]
			]
		];
		yield 'function call with empty Natural Language arguments' => [
			$defaultLangArgs,
			$defaultLangRequest,
			$defaultLangFunction
		];
	}

	public function testReturnsHtmlFragmentWhenOutputTypeIsZ89() {
		$mainConfig = $this->getServiceContainer()->getMainConfig();
		$mockHttpRequestFactory = $this->createMock( HttpRequestFactory::class );

		$mockClientStore = $this->createMock( WikifunctionsClientStore::class );
		$mockClientStore->method( 'makeFunctionCallCacheKey' )->willReturn( 'mock-cache-key' );
		$mockClientStore->method( 'fetchFromFunctionCallCache' )->willReturn( [
			'success' => true,
			'type' => ZTypeRegistry::Z_HTML_FRAGMENT,
			'value' => '
				<b data-mw="This is a bad vector!" data-mw-foo="No, really!">HTML!</b><script>alert("x")</script>
				<a href="' . $mainConfig->get( 'Server' ) . '" target="_blank" title="This will be dropped"'
					. ' onmouseover="alert(\'XSS1\')">A local link</a>
				<a href="https://af.wikipedia.org/wiki/Eenhoring" data-mw="Corruption!">Wikipedia link</a>
				<a href="https://www.google.com" target="_blank">Not a local link</a>
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
		$this->assertStringContainsString(
			'<a href="' . $mainConfig->get( 'Server' ) . '">A local link</a>',
			$html
		);
		$this->assertStringContainsString(
			'&lt;a href="https://af.wikipedia.org/wiki/Eenhoring" data-mw="Corruption!"&gt;Wikipedia link',
			$html
		);
		$this->assertStringContainsString(
			'&lt;a href="https://www.google.com" target="_blank"&gt;Not a local link',
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
		$this->assertStringContainsString( '&lt;a href="javascript:alert(\'XSS2\')"&gt;Click me', $html );
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

	// ------------------------------------------------------------------
	// Additional coverage: disabled/offline/cached-non-HTML/cached-failure branches.
	// These all short-circuit sourceToFragment() before it schedules a render job,
	// and each one is a distinct user-visible rendering mode on the client wiki.
	// ------------------------------------------------------------------

	/**
	 * Assemble a handler with a ClientStore whose cache-fetch returns $cacheValue, and
	 * capture any jobs that lazyPush receives.
	 *
	 * @param array|false|null $cacheValue value to return from fetchFromFunctionCallCache()
	 * @param array &$pushedJobs populated by the mock JobQueueGroup
	 * @return array{0: WikifunctionsPFragmentHandler, 1: ParsoidExtensionAPI}
	 */
	private function buildHandlerWithCachedValue( $cacheValue, array &$pushedJobs ): array {
		$mainConfig = $this->getServiceContainer()->getMainConfig();

		$mockClientStore = $this->createMock( WikifunctionsClientStore::class );
		$mockClientStore->method( 'makeFunctionCallCacheKey' )->willReturn( 'mock-cache-key' );
		$mockClientStore->method( 'fetchFromFunctionCallCache' )->willReturn( $cacheValue );
		$this->setService( 'WikifunctionsClientStore', $mockClientStore );

		$mockJobQueueGroup = $this->createMock( JobQueueGroup::class );
		$mockJobQueueGroup
			->method( 'lazyPush' )
			->willReturnCallback( static function ( $job ) use ( &$pushedJobs ) {
				$pushedJobs[] = $job;
				return true;
			} );

		$handler = new WikifunctionsPFragmentHandler(
			$mainConfig,
			$mockJobQueueGroup,
			$this->createMock( HttpRequestFactory::class )
		);

		$extApi = new ParsoidExtensionAPI( new MockEnv( [] ), [] );
		return [ $handler, $extApi ];
	}

	public function testSourceToFragment_returnsErrorLiteralWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$pushedJobs = [];
		[ $handler, $extApi ] = $this->buildHandlerWithCachedValue( null, $pushedJobs );

		$fragment = $handler->sourceToFragment( $extApi, $this->getMockArguments( [ 'Z10000', 'foo' ] ), false );

		// WikifunctionsPFragment extends LiteralStringPFragment, but its inherited
		// newFromLiteral() doesn't use late static binding — so the actual returned
		// type is the parent LiteralStringPFragment. What we care about is that we
		// got a literal string fragment, not a pending/HTML one.
		$this->assertInstanceOf(
			LiteralStringPFragment::class,
			$fragment,
			'Disabled client mode returns an error literal, not a pending fragment or HTML'
		);
		$this->assertNotInstanceOf( HtmlPFragment::class, $fragment );
		$this->assertNotInstanceOf( WikifunctionsPendingFragment::class, $fragment );
		$this->assertSame(
			[], $pushedJobs,
			'Disabled client mode must not queue any jobs — nothing to render, nothing to track'
		);
	}

	public function testSourceToFragment_returnsErrorBoxWhenClientModeOffline() {
		$this->overrideConfigValue( 'WikiLambdaClientModeOffline', true );

		// Cache miss — we need to reach the offline check, which sits after the cache branch.
		$pushedJobs = [];
		[ $handler, $extApi ] = $this->buildHandlerWithCachedValue( null, $pushedJobs );

		$fragment = $handler->sourceToFragment( $extApi, $this->getMockArguments( [ 'Z10000', 'foo' ] ), false );

		$this->assertInstanceOf( HtmlPFragment::class, $fragment );
		$this->assertStringContainsString(
			'cdx-message--error',
			$fragment->asHtmlString( $extApi ),
			'Offline mode renders Html::errorBox() — expect the Codex error-message class'
		);
		// The usage-tracking job runs before the offline branch; the render job does not.
		$this->assertCount(
			1, $pushedJobs,
			'Only the usage-tracking job is queued — not the render job'
		);
		$this->assertInstanceOf( WikifunctionsClientUsageUpdateJob::class, $pushedJobs[0] );
	}

	public function testSourceToFragment_returnsLiteralForCachedNonHtmlSuccess() {
		$pushedJobs = [];
		[ $handler, $extApi ] = $this->buildHandlerWithCachedValue(
			[
				'success' => true,
				// No 'type' key → fall through the Z89 check, return as literal.
				'value' => 'cached answer',
			],
			$pushedJobs
		);

		$fragment = $handler->sourceToFragment( $extApi, $this->getMockArguments( [ 'Z10000', 'foo' ] ), false );

		$this->assertInstanceOf(
			LiteralStringPFragment::class,
			$fragment,
			'Non-HtmlFragment cached success returns a literal fragment'
		);
		$this->assertNotInstanceOf( HtmlPFragment::class, $fragment );
		$this->assertNotInstanceOf( WikifunctionsPendingFragment::class, $fragment );
		// Cache hit → render job skipped; usage-tracking job still pushed.
		$this->assertCount( 1, $pushedJobs );
		$this->assertInstanceOf( WikifunctionsClientUsageUpdateJob::class, $pushedJobs[0] );
	}

	public function testSourceToFragment_returnsErrorFragmentForCachedFailure() {
		// Parsoid's MockDataAccess only accepts a hard-coded allowlist of tracking
		// categories (broken-file-category, magiclink-tracking-*, hidden-category-category).
		// Extension-registered categories from extension.json are invisible to the mock,
		// so we use 'broken-file' here — not a real WikiLambda error key, but the handler
		// treats the key as opaque and this exercises the same branch.
		$pushedJobs = [];
		[ $handler, $extApi ] = $this->buildHandlerWithCachedValue(
			[
				'success' => false,
				'errorMessageKey' => 'broken-file',
			],
			$pushedJobs
		);

		$fragment = $handler->sourceToFragment( $extApi, $this->getMockArguments( [ 'Z10000', 'foo' ] ), false );

		$this->assertInstanceOf(
			HtmlPFragment::class,
			$fragment,
			'Cached failure returns an HTML error chip, not a literal'
		);
		$html = $fragment->asHtmlString( $extApi );
		$this->assertStringContainsString(
			'cdx-info-chip--error', $html,
			'Error chip uses the Codex error-chip class'
		);
		$this->assertStringContainsString(
			'data-error-key="broken-file"', $html,
			'The cached error message key is preserved verbatim as a data attribute'
		);
		$this->assertCount(
			1, $pushedJobs,
			'Cached-failure path still tracks usage but does not re-queue a render job'
		);
		$this->assertInstanceOf( WikifunctionsClientUsageUpdateJob::class, $pushedJobs[0] );
	}
}
