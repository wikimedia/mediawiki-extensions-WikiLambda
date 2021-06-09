<?php
/**
 * WikiLambda extension Exception wrapper for a ZError object
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Exception;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;

class ZErrorException extends Exception {

	/** @var ZError */
	private $error;

	/**
	 * @param ZError $error
	 */
	public function __construct( $error ) {
		$this->error = $error;
	}

	/**
	 * @return ZObject
	 */
	public function getZErrorMessage() : ZObject {
		return $this->error->getMessage();
	}
}
