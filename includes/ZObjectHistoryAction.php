<?php
/**
 * WikiLambda history action for ZObjects, just to set a nicer title
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Exception;
use MediaWiki\Actions\HistoryAction;

class ZObjectHistoryAction extends HistoryAction {
	/**
	 * @inheritDoc
	 */
	protected function getPageTitle() {
		// Fallback to parent if the page doesn't exist yet, as we have nothing to do.
		if ( !$this->getTitle()->exists() ) {
			return parent::getPageTitle();
		}

		try {
			$zObjectStore = WikiLambdaServices::getZObjectStore();
			$targetZObject = $zObjectStore->fetchZObjectByTitle( $this->getTitle() );
		} catch ( Exception ) {
			// Something went wrong (e.g. corrupted ZObject), so fall back.
			return parent::getPageTitle();
		}

		// Fallback to parent if somehow after all that it's not loadable.
		if ( !$targetZObject ) {
			return parent::getPageTitle();
		}

		$label = $targetZObject->getLabels()->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->placeholderNoFallback()
			->getString();

		return $this->msg( 'wikilambda-history-title' )
			->rawParams( htmlspecialchars( $label ?? '' ), $this->getTitle()->getText() );
	}

}
