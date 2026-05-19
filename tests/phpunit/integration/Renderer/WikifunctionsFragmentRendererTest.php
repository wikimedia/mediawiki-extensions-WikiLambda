<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Renderer;

use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentImageRenderer;
use MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Renderer\WikifunctionsFragmentRenderer
 * @group Database
 */
class WikifunctionsFragmentRendererTest extends MediaWikiIntegrationTestCase {

	/**
	 * Build a renderer with a stub image renderer.
	 *
	 * @param WikifunctionsFragmentImageRenderer|null $imageRenderer
	 *   When null, a stub that returns a sentinel figure string is used.
	 */
	private function buildRenderer(
		?WikifunctionsFragmentImageRenderer $imageRenderer = null
	): WikifunctionsFragmentRenderer {
		if ( $imageRenderer === null ) {
			$imageRenderer = $this->createMock( WikifunctionsFragmentImageRenderer::class );
			$imageRenderer->method( 'render' )
				->willReturnCallback( static function ( ?string $mid, string $size, ?string $alt ): string {
					if ( $mid === null ) {
						return '<figure class="ext-wikilambda-image ext-wikilambda-image--warning">'
							. '<div class="ext-wikilambda-image__placeholder">'
							. '<span class="ext-wikilambda-image__placeholder-icon"></span>'
							. '</div>'
							. '<figcaption>No image selected</figcaption>'
							. '</figure>';
					}
					return '<figure class="ext-wikilambda-image" data-mid="' . $mid
						. '" data-size="' . $size
						. '" data-alt="' . ( $alt ?? '' ) . '"></figure>';
				} );
		}

		return new WikifunctionsFragmentRenderer(
			LoggerFactory::getInstance( 'WikiLambda' ),
			$this->getServiceContainer()->getUserFactory(),
			$this->getServiceContainer()->getMainConfig(),
			$imageRenderer
		);
	}

	// ------------------------------------------------------------------
	// render() — no image elements
	// ------------------------------------------------------------------

	public function testRender_htmlWithNoImageElements_passesThrough() {
		$renderer = $this->buildRenderer();
		$input = '<b>Hello</b> <span>world</span>';
		$result = $renderer->render( $input );
		$this->assertStringContainsString( '<b>Hello</b>', $result );
	}

	public function testRender_sanitisesScriptTags() {
		$renderer = $this->buildRenderer();
		$result = $renderer->render( '<b>Safe</b><script>alert(1)</script>' );
		$this->assertStringContainsString( '<b>Safe</b>', $result );
		$this->assertStringNotContainsString( '<script>', $result );
	}

	// ------------------------------------------------------------------
	// render() — with image elements
	// ------------------------------------------------------------------

	public function testRender_imageElement_isExpandedToFigure() {
		$renderer = $this->buildRenderer();
		$input = '<b>Hello</b> <ext-wikilambda-image mid="M123" size="thumb" />';
		$result = $renderer->render( $input );

		$this->assertStringContainsString( '<b>Hello</b>', $result );
		$this->assertStringContainsString( '<figure', $result );
		$this->assertStringContainsString( 'data-mid="M123"', $result );
		$this->assertStringContainsString( 'data-size="thumb"', $result );
	}

	public function testRender_imageElementWithAlt_passesAltToImageRenderer() {
		$renderer = $this->buildRenderer();
		$input = '<ext-wikilambda-image mid="M123" size="thumb" alt="A cute cat" />';
		$result = $renderer->render( $input );

		$this->assertStringContainsString( 'data-alt="A cute cat"', $result );
	}

	public function testRender_imageElementWithNoSize_defaultsToThumb() {
		$renderer = $this->buildRenderer();
		$input = '<ext-wikilambda-image mid="M123" />';
		$result = $renderer->render( $input );

		$this->assertStringContainsString( 'data-size="thumb"', $result );
	}

	public function testRender_imageElementMissingMid_returnsBrokenFigure() {
		$renderer = $this->buildRenderer();
		$input = '<ext-wikilambda-image size="thumb" />';
		$result = $renderer->render( $input );

		$this->assertStringContainsString( '<figure', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image', $result );
		$this->assertStringContainsString( 'ext-wikilambda-image__placeholder', $result );
		$this->assertStringContainsString( '<figcaption', $result );
		$this->assertStringNotContainsString( '<img', $result );
	}

	public function testRender_multipleImageElements_allExpanded() {
		$renderer = $this->buildRenderer();
		$input = '<ext-wikilambda-image mid="M1" size="thumb" />'
			. ' and '
			. '<ext-wikilambda-image mid="M2" size="thumb" />';
		$result = $renderer->render( $input );

		$this->assertStringContainsString( 'data-mid="M1"', $result );
		$this->assertStringContainsString( 'data-mid="M2"', $result );
	}

	public function testRender_imagePlaceholderDoesNotSurviveInOutput() {
		$renderer = $this->buildRenderer();
		$input = '<ext-wikilambda-image mid="M1" size="thumb" />';
		$result = $renderer->render( $input );

		$this->assertStringNotContainsString( 'WLIMGPLACEHOLDER', $result );
	}

	public function testRender_imageInterspersedWithText_preservesOrder() {
		$renderer = $this->buildRenderer();
		$input = '<b>Before</b><ext-wikilambda-image mid="M1" size="thumb" /><b>After</b>';
		$result = $renderer->render( $input );

		$beforePos = strpos( $result, 'Before' );
		$figurePos = strpos( $result, '<figure' );
		$afterPos = strpos( $result, 'After' );

		$this->assertNotFalse( $beforePos );
		$this->assertNotFalse( $figurePos );
		$this->assertNotFalse( $afterPos );
		$this->assertLessThan( $figurePos, $beforePos, 'Before text must precede the figure' );
		$this->assertLessThan( $afterPos, $figurePos, 'Figure must precede After text' );
	}
}
