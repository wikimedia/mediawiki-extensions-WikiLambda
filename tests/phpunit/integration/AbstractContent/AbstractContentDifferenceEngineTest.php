<?php

/**
 * WikiLambda integration test suite for the AbstractContentDifferenceEngine class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Content\WikitextContent;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDifferenceEngine;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentDifferenceEngine
 * @group Database
 */
class AbstractContentDifferenceEngineTest extends WikiLambdaIntegrationTestCase {

	public function testGenerateContentDiffBody_validDiff() {
		$oldContent = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$newContent = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]},'
				. '"Q1111111":{"index":1,"fragments":["Z89"]}}}'
		);

		$engine = new AbstractContentDifferenceEngine( RequestContext::getMain() );

		$result = $engine->generateContentDiffBody( $oldContent, $newContent );

		// The diff should contain markup showing the added section
		$this->assertNotSame( '', $result );
		$this->assertStringContainsString( 'Q1111111', $result );
	}

	public function testGenerateContentDiffBody_identicalContent() {
		$json = '{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}';
		$oldContent = new AbstractWikiContent( $json );
		$newContent = new AbstractWikiContent( $json );

		$engine = new AbstractContentDifferenceEngine( RequestContext::getMain() );

		$result = $engine->generateContentDiffBody( $oldContent, $newContent );

		// Identical content produces empty diff
		$this->assertSame( '', $result );
	}

	public function testGenerateContentDiffBody_incompatibleContent() {
		$abstractContent = new AbstractWikiContent(
			'{"qid":"Q42","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$wikitextContent = new WikitextContent( 'Hello world' );

		$engine = new AbstractContentDifferenceEngine( RequestContext::getMain() );

		$result = $engine->generateContentDiffBody( $wikitextContent, $abstractContent );

		// Returns empty string for incompatible content types
		$this->assertSame( '', $result );
	}
}
