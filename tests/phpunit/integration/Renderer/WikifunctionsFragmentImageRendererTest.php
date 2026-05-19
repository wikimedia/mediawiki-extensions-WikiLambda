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
	 */
	private function buildRenderer(
		?HttpRequestFactory $httpFactory = null,
		?MemcachedWrapper $cache = null,
		?BadFileLookup $badFileLookup = null
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
			LoggerFactory::getInstance( 'WikiLambda' ),
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
		$content = is_array( $body ) ? json_encode( $body ) : $body;

		$mockRequest = $this->createMock( MWHttpRequest::class );
		$mockRequest->method( 'execute' )->willReturn(
			$isOk ? StatusValue::newGood() : StatusValue::newFatal( 'http-request-error' )
		);
		$mockRequest->method( 'getContent' )->willReturn( $content );
		$mockRequest->method( 'getStatus' )->willReturn( $isOk ? 200 : 503 );

		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->method( 'create' )->willReturn( $mockRequest );
		return $factory;
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
					[ 'missing' => true, 'title' => 'File:Does-not-exist.jpg' ]
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
			static function ( string $key, mixed $value ) use ( &$cacheStore ): bool {
				$cacheStore[$key] = $value;
				return true;
			}
		);

		$renderer = $this->buildRenderer( $factory, $cache );
		$renderer->render( 'M68960758', 'thumb', null );
		// Second call must hit cache, not make a new HTTP request.
		$renderer->render( 'M68960758', 'thumb', null );
	}

	public function testRender_doesNotCacheApiErrors() {
		// The HTTP factory is called on each request when the API fails.
		$factory = $this->createMock( HttpRequestFactory::class );
		$factory->expects( $this->exactly( 2 ) )
			->method( 'create' )
			->willReturnCallback( function () {
				$req = $this->createMock( MWHttpRequest::class );
				$req->method( 'execute' )->willReturn( StatusValue::newFatal( 'error' ) );
				$req->method( 'getContent' )->willReturn( '' );
				$req->method( 'getStatus' )->willReturn( 503 );
				return $req;
			} );

		$cache = $this->createMock( MemcachedWrapper::class );
		$cache->method( 'makeKey' )->willReturnCallback(
			static fn ( string ...$parts ) => implode( ':', $parts )
		);
		$cache->method( 'get' )->willReturn( false );
		$cache->expects( $this->never() )->method( 'set' );

		$renderer = $this->buildRenderer( $factory, $cache );
		$renderer->render( 'M68960758', 'thumb', null );
		// Second call must retry the API, not hit the cache.
		$renderer->render( 'M68960758', 'thumb', null );
	}
}
