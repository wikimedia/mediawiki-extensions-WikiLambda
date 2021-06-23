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
		// We call the parent construction passing a message so that it can give some information
		// if the exception is called and printed in php
		parent::__construct( $error->getMessage() );
		$this->error = $error;
	}

	/**
	 * @return ZError
	 */
	public function getZError() : ZError {
		return $this->error;
	}

	/**
	 * @return ZObject
	 */
	public function getZErrorMessage() : ZObject {
		return $this->error->getZValue();
	}

	/**
	 * @return string
	 */
	public function getZErrorType() : string {
		return $this->error->getZErrorType();
	}
}
