<?php
/**
 * WikiLambda ZObjectRegistry abstract class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

abstract class ZObjectRegistry {

	/**
	 * @var array
	 */
	protected $registry = [];

	/**
	 * @var string
	 */
	protected $type;

	/**
	 * @var array
	 */
	private static $instances = [];

	private function __construct() {
		$class = get_called_class();
		if ( !array_key_exists( $class, self::$instances ) ) {
			$this->initialize();
		}
	}

	final public static function singleton() {
		$class = get_called_class();
		if ( !array_key_exists( $class, self::$instances ) ) {
			self::$instances[ $class ] = new $class();
		}
		return self::$instances[ $class ];
	}

	/**
	 * Initialize method, to be implemented by every registry class
	 */
	abstract protected function initialize() : void;

	/**
	 * Unregisters the zid from any of the existing registry instances
	 *
	 * @param string $zid
	 */
	public static function unregisterZid( string $zid ) {
		foreach ( self::$instances as $class => $registry ) {
			$registry->unregister( $zid );
		}
	}

	public function register( string $key, string $value ) : void {
		$this->registry[ $key ] = $value;
	}

	public function unregister( string $zid ) : void {
		unset( $this->registry[ $zid ] );
	}
}
