<?php
/**
 * WikiLambda AbstractWikiLogFormatter to format the Abstract Wikipedia related logs.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Logging\LogFormatter;
use MediaWiki\Message\Message;
use MediaWiki\Title\Title;

class AbstractWikiLogFormatter extends LogFormatter {

	/**
	 * @inheritDoc
	 */
	protected function getMessageKey() {
		$subtype = $this->entry->getSubtype();
		$redirect = $this->entry->getParameters()[ '5::redirect' ] ?? '';
		$dashRedirect = $subtype === 'optin' && $redirect ? '-redirect' : '';

		// Messages that can be used here:
		// * wikilambda-abstract-log-action-optin
		// * wikilambda-abstract-log-action-optin-redirect
		// * wikilambda-abstract-log-action-optout
		return "wikilambda-abstract-log-action-$subtype$dashRedirect";
	}

	/**
	 * @inheritDoc
	 */
	protected function getMessageParameters(): array {
		$params = parent::getMessageParameters();

		$qid = $this->entry->getParameters()[ '4::qid' ] ?? '';
		$primary = $this->entry->getParameters()[ '5::redirect' ] ?? '';

		// Build [[abstract:Q42]] link for the message parameters
		$awTitle = Title::makeTitle( NS_MAIN, $qid, '', 'abstract' );
		$params[3] = Message::rawParam( $this->getLinkRenderer()->makeLink( $awTitle, $qid ) );

		// Build [[Primary title]] link when the added title is a redirect
		if ( $primary ) {
			$primaryTitle = Title::makeTitle( NS_MAIN, $primary );
			$params[4] = Message::rawParam( $this->getLinkRenderer()->makeLink( $primaryTitle, $primary ) );
		}

		return $params;
	}
}
