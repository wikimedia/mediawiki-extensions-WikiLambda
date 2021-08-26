<?php
/**
 * WikiLambda history action for ZObjects, just to set a nicer title
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use HistoryAction;

class ZObjectHistoryAction extends HistoryAction {
	/**
	 * @inheritDoc
	 */
	protected function getPageTitle() {
		// Fallback to parent if the page doesn't exist yet, as we have nothing to do.
		if ( !$this->getTitle()->exists() ) {
			return parent::getPageTitle();
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$targetZObject = $zObjectStore->fetchZObjectByTitle( $this->getTitle() );
		// Fallback to parent if somehow after all that it's not loadable.
		if ( !$targetZObject ) {
			return parent::getPageTitle();
		}

		$label = $targetZObject->getLabels()->getStringForLanguageOrEnglish( $this->getLanguage() );

		return $this->msg( 'wikilambda-history-title' )
			->rawParams( htmlspecialchars( $label ), $this->getTitle()->getText() )
			->text();
	}

}
