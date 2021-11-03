<?php
/**
 * WikiLambda wrapper object for WikiPage creation status
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use WikiPage;

class ZObjectPage {

	/**
	 * @var WikiPage
	 */
	private $page = null;

	/**
	 * @var ZError
	 */
	private $errors = null;

	/**
	 * @param WikiPage $page
	 * @param ZError|null $errors
	 */
	private function __construct( $page, $errors = null ) {
		$this->page = $page;
		$this->errors = $errors;
	}

	public static function newSuccess( $page ) {
		return new self( $page );
	}

	public static function newFatal( $errors ) {
		return new self( null, $errors );
	}

	public function getWikiPage() {
		return $this->page;
	}

	public function getErrors() {
		return $this->errors;
	}

	public function isOK() {
		return ( $this->page !== null );
	}

	public function getTitle() {
		if ( $this->isOK() ) {
			return $this->page->getTitle();
		}
		return null;
	}
}
