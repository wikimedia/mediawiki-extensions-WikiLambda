<?php
/**
 * WikiLambda ZObject interface
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

/**
 * This class represents the generic ZObject concept
 */
interface ZObject {

	/**
	 * @param array $objectVars The raw content of the object from which to create the ZObject.
	 * @return ZObject A new ZObject of this item.
	 */
	public static function create( array $objectVars ) : ZObject;

	/**
	 * Provide this ZObject's schema.
	 *
	 * @return array It's complicated.
	 */
	public static function getDefinition() : array;

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid() : bool;

	/**
	 * @return string The type of this ZObject
	 */
	public function getZType() : string;

	/**
	 * @return mixed The generic content of this ZObject; most ZObject types will implement specific
	 *   accessors specific to that type.
	 */
	public function getZValue();
}
