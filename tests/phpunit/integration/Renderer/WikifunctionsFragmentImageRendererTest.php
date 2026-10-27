<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Renderer;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentImageRenderer;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Http\MWHttpRequest;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Page\File\BadFileLookup;
use MediaWikiIntegrationTestCase;
use Psr\Log\LoggerInterface;
use StatusValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentImageRenderer
 * @group Database
 */
class WikifunctionsFragmentImageRendererTest extends MediaWikiIntegrationTestCase {

	/** A minimal valid Commons imageinfo API response for page 68960758 */
	private const VALID_API_RESPONSE = [
		'query' => [
			'pages' => [
				[
					'pageid' => 68960758,
					'title' => 'File:Cat.jpg',
					'imageinfo' => [
						[
							'url' => 'https://upload.wikimedia.org/wikipedia/commons/cat.jpg',
							'thumburl' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/cat.jpg/250px-cat.jpg',
							'thumbwidth' => 250,
							'thumbheight' => 188,
							'descriptionurl' => 'https://commons.wikimedia.org/wiki/File:Cat.jpg',
							'mime' => 'image/jpeg',
						]
					]
				]
			]
		]
	];

	/**
	 * Build a renderer with mockable dependencies.
	 *
	 * @param HttpRequestFactory|null $httpFactory When null, creates a mock that returns no responses.
	 * @param MemcachedWrapper|null $cache When null, creates a no-op mock (always cache miss, no writes).
	 * @param BadFileLookup|null $badFileLookup When null, creates a mock where isBadFile returns false.
	 * @param LoggerInterface|null $logger When null, uses the real WikiLambda channel logger.
	 */
	private function buildRenderer(
		?HttpRequestFactory $httpFactory = null,
		?MemcachedWrapper $cache = null,
		?BadFileLookup $badFileLookup = null,
		?LoggerInterface $logger = null
	): WikifunctionsFragmentImageRenderer {
		if ( $cache === null ) {
			$cache = $this->createMock( MemcachedWrapper::class );
			$cache->method( 'makeKey' )->willReturnCallback(
				static fn ( string ...$parts ) => implode( ':', $parts )
			);
			$cache->method( 'get' )->willReturn( false );
		}

		if ( $badFileLookup === null ) {
			$badFileLookup = $this->createMock( BadFileLookup::class );
			$badFileLookup->method( 'isBadFile' )->willReturn( false );
		}

		return new WikifunctionsFragmentImageRenderer(
			$logger ?? LoggerFactory::getInstance( 'WikiLambda' ),
			$httpFactory ?? $this->createMock( HttpRequestFactory::class ),
			$cache,
			$badFileLookup
		);
	}

	/**
	 * Build a mock HttpRequestFactory that returns the given JSON body with HTTP 200.
	 *
	 * @param array|string $body Array is JSON-encoded; pass a string for raw/invalid JSON.
	 * @param bool $isOk Whether the execute() call reports success.
	 */
	private function makeHttpFactory( $body, bool $isOk = true ): HttpRequestFactory {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->method( 'create' )->willReturn( $this->makeHttpRequest( $body, $isOk ) );
		return $factory;
	}

	/**
	 * Build a mock MWHttpRequest that returns the given JSON body.
	 *
	 * @param array|string $body Array is JSON-encoded; pass a string for raw/invalid JSON.
	 * @param bool $isOk Whether the execute() call reports success.
	 */
	private function makeHttpRequest( $body, bool $isOk = true ): MWHttpRequest {
		$mockRequest = $this->createMock( MWHttpRequest::class );
		$mockRequest->method( 'execute' )->willReturn(
			$isOk ? StatusValue::newGood() : StatusValue::newFatal( 'http-request-error' )
		);
		$mockRequest->method( 'getContent' )->willReturn( is_array( $body ) ? json_encode( $body ) : $body );
		$mockRequest->method( 'getStatus' )->willReturn( $isOk ? 200 : 503 );
		return $mockRequest;
	}

	/**
	 * Build a MemcachedWrapper mock that keeps the values in $cacheStore and their TTLs in $cacheTTLs.
	 */
	private function makeInMemoryCache( array &$cacheStore, array &$cacheTTLs = [] ): MemcachedWrapper {
		$cache = $this->createMock( MemcachedWrapper::class );
		$cache->method( 'makeKey' )->willReturnCallback(
			static fn ( string ...$parts ) => implode( ':', $parts )
		);
		$cache->method( 'get' )->willReturnCallback(
			static function ( string $key ) use ( &$cacheStore ) {
				return $cacheStore[$key] ?? false;
			}
		);
		$cache->method( 'set' )->willReturnCallback(
			static function ( string $key, mixed $value, int $ttl ) use ( &$cacheStore, &$cacheTTLs ): bool {
				$cacheStore[$key] = $value;
				$cacheTTLs[$key] = $ttl;
				return true;
			}
		);
		return $cache;
	}

	/**
	 * Build an imageinfo API page for a file, as the Commons API returns it.
	 */
	private static function makeApiPage( int $pageId, string $title ): array {
		return [
			'pageid' => $pageId,
			'title' => $title,
			'imageinfo' => [ [
				'thumburl' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/x.jpg/250px-x.jpg',
				'thumbwidth' => 250,
				'thumbheight' => 188,
				'descriptionurl' => 'https://commons.wikimedia.org/wiki/' . $title,
				'mime' => 'image/jpeg',
			] ],
		];
	}

	// ------------------------------------------------------------------
	// Input validation — authoring problems return warning figures
	// ------------------------------------------------------------------

	public function testRender_nullMid_returnsWarningFigure() {
		$result = $this->buildRenderer()->render( null, 'thumb', null );
		$this->assertStringContainsString( '<figure', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image--warning', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringContainsString( '<figcaption', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_invalidMidFormat_returnsWarningFigure() {
		$result = $this->buildRenderer()->render( 'not-an-mid', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_midWithoutPrefix_returnsWarningFigure() {
		$result = $this->buildRenderer()->render( '68960758', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_midWithLeadingZero_returnsErrorFigureWithoutCallingApi() {
		// A leading zero would give a second M-ID, and a second cache key, for the same page.
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->never() )->method( 'create' );

		$result = $this->buildRenderer( $factory )->render( 'M068960758', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_midWithLettersAfterM_returnsWarningFigure() {
		$result = $this->buildRenderer()->render( 'Mabc', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_unsupportedSize_returnsWarningFigure() {
		$result = $this->buildRenderer()->render( 'M68960758', 'large', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	// ------------------------------------------------------------------
	// Logging of authoring problems
	// ------------------------------------------------------------------

	/**
	 * A malformed M-ID is a function-authoring mistake, not a system fault, so it must stay at
	 * info — it was previously a warning and made up most of this class's production log volume.
	 * The rejected value and the caller's context are both needed to trace which function
	 * emitted it.
	 */
	public function testRender_invalidMidFormat_logsAtInfoWithValueAndCallerContext() {
		$logger = $this->createMock( LoggerInterface::class );
		$logger->expects( $this->never() )->method( 'warning' );
		$logger->expects( $this->once() )
			->method( 'info' )
			->with(
				$this->stringContains( 'Invalid M-ID format' ),
				$this->logicalAnd(
					$this->arrayHasKey( 'mid' ),
					$this->arrayHasKey( 'function' ),
					$this->arrayHasKey( 'page' )
				)
			);

		$this->buildRenderer( null, null, null, $logger )->render(
			'not-an-mid',
			'thumb',
			null,
			[ 'function' => 'Z12345', 'page' => 'Main Page' ]
		);
	}

	/**
	 * A rejected M-ID is arbitrary function output, so its length is unbounded. Log a shortened
	 * value, and the real length alongside it so truncation is never mistaken for the input.
	 */
	public function testRender_overlongInvalidMid_logsTruncatedValueAndRealLength() {
		$logger = $this->createMock( LoggerInterface::class );
		$logger->expects( $this->once() )
			->method( 'info' )
			->with(
				$this->anything(),
				$this->callback( static function ( array $logContext ): bool {
					return strlen( $logContext['mid'] ) === 100 && $logContext['midLength'] === 5000;
				} )
			);

		$this->buildRenderer( null, null, null, $logger )->render(
			str_repeat( 'x', 5000 ),
			'thumb',
			null
		);
	}

	/**
	 * Commons being unreachable is a system fault, so it stays at warning whilst the authoring
	 * problems above are demoted.
	 */
	public function testRender_commonsApiFailure_staysAtWarning() {
		$logger = $this->createMock( LoggerInterface::class );
		$logger->expects( $this->atLeastOnce() )
			->method( 'warning' )
			->with( $this->stringContains( 'Commons API request failed' ), $this->anything() );

		$this->buildRenderer( $this->makeHttpFactory( '', false ), null, null, $logger )
			->render( 'M68960758', 'thumb', null );
	}

	// ------------------------------------------------------------------
	// Commons API responses — system/policy failures return error figures
	// ------------------------------------------------------------------

	public function testRender_apiNetworkError_returnsErrorFigure() {
		$result = $this->buildRenderer( $this->makeHttpFactory( '', false ) )
			->render( 'M68960758', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringContainsString( '<figcaption', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_apiReturnsInvalidJson_returnsErrorFigure() {
		$result = $this->buildRenderer( $this->makeHttpFactory( 'not-json' ) )
			->render( 'M68960758', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_pageMarkedMissing_returnsErrorFigure() {
		$body = [
			'query' => [
				'pages' => [
					[ 'pageid' => 99999999, 'missing' => true ]
				]
			]
		];
		$result = $this->buildRenderer( $this->makeHttpFactory( $body ) )
			->render( 'M99999999', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_nonImageMime_returnsErrorFigure() {
		$body = [
			'query' => [
				'pages' => [
					[
						'pageid' => 1,
						'title' => 'File:Doc.pdf',
						'imageinfo' => [
							[
								'thumburl' => 'https://upload.wikimedia.org/thumb/doc.pdf/250px.png',
								'thumbwidth' => 250,
								'thumbheight' => 350,
								'descriptionurl' => 'https://commons.wikimedia.org/wiki/File:Doc.pdf',
								'mime' => 'application/pdf',
							]
						]
					]
				]
			]
		];
		$result = $this->buildRenderer( $this->makeHttpFactory( $body ) )
			->render( 'M1', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_thumbUrlOnDisallowedHost_returnsErrorFigure() {
		$body = [
			'query' => [
				'pages' => [
					[
						'pageid' => 1,
						'title' => 'File:Image.jpg',
						'imageinfo' => [
							[
								'thumburl' => 'https://evil.example.com/thumb/image.jpg',
								'thumbwidth' => 250,
								'thumbheight' => 188,
								'descriptionurl' => 'https://commons.wikimedia.org/wiki/File:Image.jpg',
								'mime' => 'image/jpeg',
							]
						]
					]
				]
			]
		];
		$result = $this->buildRenderer( $this->makeHttpFactory( $body ) )
			->render( 'M1', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_imageOnBadFileList_returnsErrorFigure() {
		$badFileLookup = $this->createMock( BadFileLookup::class );
		$badFileLookup->method( 'isBadFile' )->willReturn( true );

		$result = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ), null, $badFileLookup )
			->render( 'M68960758', 'thumb', null );
		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	// ------------------------------------------------------------------
	// Successful render
	// ------------------------------------------------------------------

	public function testRender_validImage_returnsFigureHtml() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( '<figure', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image', $result );
		$this->assertStringContainsString( '<img', $result );
		$this->assertStringContainsString( 'upload.wikimedia.org', $result );
	}

	public function testRender_validImage_usesFileTitleAsAltWhenAltIsNull() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( 'alt="File:Cat.jpg"', $result );
	}

	public function testRender_validImage_usesExplicitAltWhenProvided() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', 'A nice cat' );

		$this->assertStringContainsString( 'alt="A nice cat"', $result );
	}

	public function testRender_errorFigure_includesAltTextAsAriaLabel() {
		// When rendering fails (any error path), the user-supplied alt text should
		// still travel with the placeholder as aria-label so assistive tech can
		// announce what the missing image was meant to be.
		$result = $this->buildRenderer()->render( 'not-an-mid', 'thumb', 'A snowy mountain' );

		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringContainsString( 'aria-label="A snowy mountain"', $result );
	}

	public function testRender_errorFigure_omitsAriaLabelWhenAltIsEmpty() {
		// An empty alt must not produce a stray aria-label="" — screen readers can
		// announce that as empty content, which is worse than no label at all.
		$result = $this->buildRenderer()->render( 'not-an-mid', 'thumb', '' );

		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringNotContainsString( 'aria-label', $result );
	}

	public function testRender_validImage_linksToDescriptionPage() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( 'href="https://commons.wikimedia.org/wiki/File:Cat.jpg"', $result );
		$this->assertStringContainsString( 'target="_blank"', $result );
		$this->assertStringContainsString( 'noopener noreferrer', $result );
	}

	public function testRender_validImage_embedsDimensions() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( 'width="250"', $result );
		$this->assertStringContainsString( 'height="188"', $result );
	}

	public function testRender_validImage_usesNativeLazyLoading() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( 'loading="lazy"', $result );
	}

	// ------------------------------------------------------------------
	// Caching
	// ------------------------------------------------------------------

	public function testRender_cachesSuccessfulResult() {
		// The HTTP factory should only be called once across two render() calls.
		$mockRequest = $this->createMock( MWHttpRequest::class );
		$mockRequest->method( 'execute' )->willReturn( StatusValue::newGood() );
		$mockRequest->method( 'getContent' )->willReturn( json_encode( self::VALID_API_RESPONSE ) );
		$mockRequest->method( 'getStatus' )->willReturn( 200 );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->willReturn( $mockRequest );

		// Simulate a real cache: set() stores the value, get() returns it on the next call.
		$cacheStore = [];
		$cacheTTLs = [];
		$cache = $this->createMock( MemcachedWrapper::class );
		$cache->method( 'makeKey' )->willReturnCallback(
			static fn ( string ...$parts ) => implode( ':', $parts )
		);
		$cache->method( 'get' )->willReturnCallback(
			static function ( string $key ) use ( &$cacheStore ) {
				return $cacheStore[$key] ?? false;
			}
		);
		$cache->method( 'set' )->willReturnCallback(
			static function ( string $key, mixed $value, int $ttl ) use ( &$cacheStore, &$cacheTTLs ): bool {
				$cacheStore[$key] = $value;
				$cacheTTLs[$key] = $ttl;
				return true;
			}
		);

		$renderer = $this->buildRenderer( $factory, $cache );
		$renderer->render( 'M68960758', 'thumb', null );
		// Second call must hit cache, not make a new HTTP request.
		$renderer->render( 'M68960758', 'thumb', null );

		// (T433448) A Commons rename or deletion keeps the M-ID but changes the thumbnail
		// URL, and nothing purges this key, so the TTL is the only limit on how long we
		// show a URL that is not there any more.
		$this->assertSame(
			[ MemcachedWrapper::TTL_DAY ],
			array_values( $cacheTTLs ),
			'Commons image data is cached for one day only'
		);
	}

	public function testRender_cachesApiErrorsForAMinute() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->willReturn( $this->makeHttpRequest( '', false ) );

		$cacheStore = [];
		$cacheTTLs = [];
		$renderer = $this->buildRenderer( $factory, $this->makeInMemoryCache( $cacheStore, $cacheTTLs ) );
		$renderer->render( 'M68960758', 'thumb', null );
		// Second call must hit cache, not make a new HTTP request.
		$result = $renderer->render( 'M68960758', 'thumb', null );

		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertSame( [ MemcachedWrapper::TTL_MINUTE ], array_values( $cacheTTLs ) );
	}

	public function testRender_cachesMissingPageForAnHour() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->willReturn( $this->makeHttpRequest( [
				'query' => [ 'pages' => [ [ 'pageid' => 99999999, 'missing' => true ] ] ]
			] ) );

		$cacheStore = [];
		$cacheTTLs = [];
		$renderer = $this->buildRenderer( $factory, $this->makeInMemoryCache( $cacheStore, $cacheTTLs ) );
		$renderer->render( 'M99999999', 'thumb', null );
		// Second call must hit cache, not make a new HTTP request.
		$result = $renderer->render( 'M99999999', 'thumb', null );

		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertSame( [ MemcachedWrapper::TTL_HOUR ], array_values( $cacheTTLs ) );
	}

	public function testRender_cachesPageThatIsNotAFileAsMissing() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			// A gallery page exists, but has no imageinfo.
			->willReturn( $this->makeHttpRequest( [
				'query' => [ 'pages' => [ [ 'pageid' => 123, 'title' => 'Cats' ] ] ]
			] ) );

		$cacheStore = [];
		$cacheTTLs = [];
		$renderer = $this->buildRenderer( $factory, $this->makeInMemoryCache( $cacheStore, $cacheTTLs ) );
		$renderer->render( 'M123', 'thumb', null );
		$result = $renderer->render( 'M123', 'thumb', null );

		$this->assertStringContainsString( 'ext-wikilambda-image--error', $result );
		$this->assertSame( [ MemcachedWrapper::TTL_HOUR ], array_values( $cacheTTLs ) );
	}

	// ------------------------------------------------------------------
	// Commons API request
	// ------------------------------------------------------------------

	public function testRender_commonsRequestHasTimeout() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			// The render waits for the request, so it must not use the longer default timeout.
			->with( $this->anything(), $this->callback( static fn ( array $options ) => isset( $options['timeout'] ) ) )
			->willReturn( $this->makeHttpRequest( self::VALID_API_RESPONSE ) );

		$this->buildRenderer( $factory )->render( 'M68960758', 'thumb', null );
	}

	// ------------------------------------------------------------------
	// File name lookup
	// ------------------------------------------------------------------

	public function testGetFileNames_validResponse() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( self::VALID_API_RESPONSE ) );
		$this->assertSame( [ 'M68960758' => 'Cat.jpg' ], $renderer->getFileNames( [ 'M68960758' ] ) );
	}

	public function testGetFileNames_invalidMids_doNotCallApi() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->never() )->method( 'create' );

		$renderer = $this->buildRenderer( $factory );
		$this->assertSame( [], $renderer->getFileNames( [ 'not-an-mid', '68960758' ] ) );
	}

	public function testGetFileNames_missingPage() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( [
			'query' => [ 'pages' => [ [ 'pageid' => 1, 'missing' => true ] ] ]
		] ) );
		$this->assertSame( [], $renderer->getFileNames( [ 'M1' ] ) );
	}

	public function testGetFileNames_apiError() {
		$renderer = $this->buildRenderer( $this->makeHttpFactory( '', false ) );
		$this->assertSame( [], $renderer->getFileNames( [ 'M68960758' ] ) );
	}

	public function testGetFileNames_oneRequestForTheUncachedMids() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->with( $this->callback( static fn ( string $url ) => str_contains( $url, 'pageids=1%7C3&' ) ) )
			// The API does not return the pages in the order of the request.
			->willReturn( $this->makeHttpRequest( [ 'query' => [ 'pages' => [
				[ 'pageid' => 3, 'missing' => true ],
				self::makeApiPage( 1, 'File:One.jpg' ),
			] ] ] ) );

		$cacheStore = [ 'WikiLambdaCommonsFileData:M2:thumb' => [ 'title' => 'File:Two.jpg' ] ];
		$renderer = $this->buildRenderer( $factory, $this->makeInMemoryCache( $cacheStore ) );

		$this->assertSame(
			[ 'M2' => 'Two.jpg', 'M1' => 'One.jpg' ],
			$renderer->getFileNames( [ 'M2', 'M1', 'M3' ] )
		);
	}

	public function testGetFileNames_splitsRequestsAt50Mids() {
		$requestedPageIdCounts = [];
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->exactly( 2 ) )
			->method( 'create' )
			->willReturnCallback( function ( string $url ) use ( &$requestedPageIdCounts ) {
				parse_str( parse_url( $url, PHP_URL_QUERY ), $query );
				$requestedPageIdCounts[] = count( explode( '|', $query['pageids'] ) );
				return $this->makeHttpRequest( [ 'query' => [ 'pages' => [] ] ] );
			} );

		$mids = array_map( static fn ( $pageId ) => "M$pageId", range( 1, 51 ) );
		$this->buildRenderer( $factory )->getFileNames( $mids );

		$this->assertSame( [ 50, 1 ], $requestedPageIdCounts );
	}

	public function testGetFileNames_sharesCacheWithRender() {
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->once() )
			->method( 'create' )
			->willReturn( $this->makeHttpRequest( self::VALID_API_RESPONSE ) );

		$cacheStore = [];
		$renderer = $this->buildRenderer( $factory, $this->makeInMemoryCache( $cacheStore ) );
		$this->assertSame( [ 'M68960758' => 'Cat.jpg' ], $renderer->getFileNames( [ 'M68960758' ] ) );
		// The render must use the cached data, not make a new HTTP request.
		$this->assertStringContainsString( '<img', $renderer->render( 'M68960758', 'thumb', null ) );
	}
}
