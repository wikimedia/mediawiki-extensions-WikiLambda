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

use Content;
use DifferenceEngine;
use MediaWiki\Extension\WikiLambda\ZObjectContent;

class ZObjectContentDifferenceEngine extends DifferenceEngine {

	/**
	 * @inheritDoc
	 */
	public function generateContentDiffBody( Content $oldContent, Content $newContent ) {
		if ( !( $oldContent instanceof ZObjectContent && $newContent instanceof ZObjectContent ) ) {
			$this->getOutput()->showErrorPage( 'errorpagetitle', 'wikilambda-diff-incompatible' );
			return '';
		}

		// $slotRenderer = new ZObjectSlotDiffRenderer();
		// $diffObject = $slotRenderer->getDiff( $oldContent, $newContent );

		// TODO: generate and return html body of the diff page
		return '';
	}
}
