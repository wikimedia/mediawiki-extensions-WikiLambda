<?php
/**
 * WikiLambda ZObjectContentDifferenceEngine
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjectContent;

use MediaWiki\Content\Content;
use MediaWiki\Diff\DifferenceEngine;

class ZObjectContentDifferenceEngine extends DifferenceEngine {

	/**
	 * @inheritDoc
	 */
	public function generateContentDiffBody( Content $oldContent, Content $newContent ) {
		if ( !( $oldContent instanceof ZObjectContent && $newContent instanceof ZObjectContent ) ) {
			$this->getOutput()->showErrorPage( 'errorpagetitle', 'wikilambda-diff-incompatible' );
			return '';
		}

		$zObjectContentHandler = $newContent->getContentHandler();
		'@phan-var ZObjectContentHandler $zObjectContentHandler';

		$slotDiffRenderer = $zObjectContentHandler
			->getSlotDiffRendererWithOptions( $this->getContext() );
		'@phan-var ZObjectSlotDiffRenderer $slotDiffRenderer';

		return $slotDiffRenderer->getDiff( $oldContent, $newContent );
	}
}
