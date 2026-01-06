<?php
/**
 * WikiLambda AbstractContentDifferenceEngine
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use DifferenceEngine;
use MediaWiki\Content\Content;
use MediaWiki\Context\RequestContext;
use TextSlotDiffRenderer;

class AbstractContentDifferenceEngine extends DifferenceEngine {

	/**
	 * @inheritDoc
	 */
	public function generateContentDiffBody( Content $oldContent, Content $newContent ) {
		if ( !( $oldContent instanceof AbstractWikiContent && $newContent instanceof AbstractWikiContent ) ) {
			$this->getOutput()->showErrorPage( 'errorpagetitle', 'wikilambda-diff-incompatible' );
			return '';
		}
		// For now, provide users with the raw JSON diff
		$oldText = $oldContent->getText();
		$newText = $newContent->getText();

		$abstractContentHandler = $newContent->getContentHandler();
		'@phan-var AbstractWikiContentHandler $abstractContentHandler';

		$slotDiffRenderer = $abstractContentHandler
			->getSlotDiffRendererWithOptions( RequestContext::getMain() );
		'@phan-var TextSlotDiffRenderer $slotDiffRenderer';

		return $slotDiffRenderer->getTextDiff( $oldText, $newText );
	}
}
