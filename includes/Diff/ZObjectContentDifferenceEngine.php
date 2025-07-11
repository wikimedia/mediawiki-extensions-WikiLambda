<?php
/**
 * WikiLambda ZObjectContentDifferenceEngine
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Diff;

use DifferenceEngine;
use MediaWiki\Content\Content;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\MediaWikiServices;
use TextSlotDiffRenderer;

class ZObjectContentDifferenceEngine extends DifferenceEngine {

	/**
	 * @inheritDoc
	 */
	public function generateContentDiffBody( Content $oldContent, Content $newContent ) {
		if ( !( $oldContent instanceof ZObjectContent && $newContent instanceof ZObjectContent ) ) {
			$this->getOutput()->showErrorPage( 'errorpagetitle', 'wikilambda-diff-incompatible' );
			return '';
		}

		// TODO (T284473): Instead of this text diff, generate and return html body of the diff page
		// $slotRenderer = new ZObjectSlotDiffRenderer();
		// $diffObject = $slotRenderer->getDiff( $oldContent, $newContent );

		// HACK (T339348): For now, provide users with the raw JSON diff
		$oldText = $oldContent->getText();
		$newText = $newContent->getText();
		/** @var TextSlotDiffRenderer $slotDiffRenderer */

		// TODO (T362246): Dependency-inject (if we haven't replaced this by then),
		// and de-duplicate with ZObjectContentHandler::getSlotDiffRendererWithOptions()
		$slotDiffRenderer = MediaWikiServices::getInstance()
			->getContentHandlerFactory()
			->getContentHandler( CONTENT_MODEL_TEXT )
			->getSlotDiffRenderer( RequestContext::getMain() );
		'@phan-var TextSlotDiffRenderer $slotDiffRenderer';
		return $slotDiffRenderer->getTextDiff( $oldText, $newText );
	}
}
