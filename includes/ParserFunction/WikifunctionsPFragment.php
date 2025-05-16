<?php

/**
 * WikiLambda extension Parsoid fragment our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use Wikimedia\Parsoid\DOM\DocumentFragment;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\LiteralStringPFragment;

class WikifunctionsPFragment extends LiteralStringPFragment {
	// TODO: Alter this so we can control serialisation etc.

	/**
	 * @inheritDoc
	 */
	public function asDom( ParsoidExtensionAPI $ext, bool $release = false ): DocumentFragment {
		if ( !$this->isEmpty() ) {
			return parent::asDom( $ext, $release );
		}

		// (T391589) LiteralStringPFragment::asDom fails when the value is empty,
		// adding excecption here to create an empty text node.
		$doc = $ext->getTopLevelDoc();
		$df = $doc->createDocumentFragment();
		$df->appendChild( $doc->createTextNode( '' ) );

		return $df;
	}
}
