<?php
/**
 * WikiLambda wrapper object for WikiPage creation status
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Page\WikiPage;
use MediaWiki\Title\Title;

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
	 * @param WikiPage|null $page
	 * @param ZError|null $errors
	 */
	private function __construct( $page, $errors = null ) {
		$this->page = $page;
		$this->errors = $errors;
	}

	/**
	 * Create an instance of a successful ZObjectPage wrapping a WikiPage object
	 *
	 * @param WikiPage $page
	 * @return ZObjectPage
	 */
	public static function newSuccess( $page ) {
		return new self( $page );
	}

	/**
	 * Create an instance of a fatal ZObjectPage wrapping a ZError object
	 *
	 * @param ZError $errors
	 * @return ZObjectPage
	 */
	public static function newFatal( $errors ) {
		return new self( null, $errors );
	}

	/**
	 * Get the WikiPage of this ZObjectPage
	 *
	 * @return WikiPage|null
	 */
	public function getWikiPage() {
		return $this->page;
	}

	/**
	 * Get the errors of this ZObjectPage
	 *
	 * @return ZError|null
	 */
	public function getErrors() {
		return $this->errors;
	}

	/**
	 * Get whether this ZObjectPage has a page set
	 *
	 * @return bool
	 */
	public function isOK(): bool {
		return ( $this->page !== null );
	}

	/**
	 * Get the Title of this ZObjectPage if OK
	 *
	 * @return Title|null
	 */
	public function getTitle() {
		if ( $this->isOK() ) {
			return $this->page->getTitle();
		}
		return null;
	}
}
