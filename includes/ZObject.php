<?php
/**
 * WikiLambda ZObject interface
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

/**
 * This class represents the generic ZObject concept
 */
interface ZObject {

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid() : bool;

	public function getZType() : string;

	public function getZValue();
}
