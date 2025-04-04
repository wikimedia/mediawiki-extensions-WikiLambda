<?php

/**
 * WikiLambda extension Parsoid pending result for our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use MediaWiki\MediaWikiServices;
use Wikimedia\Bcp47Code\Bcp47Code;
use Wikimedia\Parsoid\Ext\AsyncResult;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Fragments\HtmlPFragment;
use Wikimedia\Parsoid\Fragments\PFragment;

class WikifunctionsPendingFragment extends AsyncResult {
	public ?PFragment $content;

	/**
	 * Create a pending fragment to display to end-users in the page if the content is not yet available for some
	 * reason. Default assumption when using this is that it's a temporary cache-miss, but this can also be used
	 * to indicate that the content is not available for some other reason, such as a systems error.
	 *
	 * @param Bcp47Code $languageCode The language in which to render messages.
	 * @param ?PFragment $messageFragment An optional message fragment to display, instead of the default.
	 */
	public function __construct( Bcp47Code $languageCode, ?PFragment $messageFragment ) {
		$messageCache = MediaWikiServices::getInstance()->getMessageCache();

		if ( $messageFragment ) {
			$this->content = $messageFragment;
			return;
		}
		$standardMessage = $messageCache->get( 'wikilambda-fragment-pending', true, $languageCode->toBcp47Code() );

		$htmlString =
			'<span class="mw-async-not-ready mw-wikifunctions-fragment-pending">'
				. $standardMessage
			. '</span>';

		$fragment = HtmlPFragment::newFromHtmlString( $htmlString, null );
		$this->content = $fragment;
	}

	public function fallbackContent( ParsoidExtensionAPI $extAPI ): ?PFragment {
		return $this->content;
	}
}
