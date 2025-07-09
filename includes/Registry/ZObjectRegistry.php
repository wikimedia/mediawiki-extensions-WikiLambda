<?php
/**
 * WikiLambda ZObjectRegistry abstract class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Registry;

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

	/**
	 * @codeCoverageIgnore
	 */
	private function __construct() {
		$class = static::class;
		if ( !array_key_exists( $class, self::$instances ) ) {
			/**
			 * @codeCoverageIgnore Our test suites always create these first in setUp(), so
			 * we never run this line in test coverage.
			 */
			$this->initialize();
		}
	}

	final public static function singleton(): static {
		$class = static::class;
		if ( !array_key_exists( $class, self::$instances ) ) {
			// @phan-suppress-next-line PhanTypeInstantiateAbstract
			self::$instances[ $class ] = new $class();
		}
		return self::$instances[ $class ];
	}

	/**
	 * Initialize method, to be implemented by every registry class
	 */
	abstract protected function initialize(): void;

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

	/**
	 * Clears and re-initializes all existing registry instances
	 */
	public static function clearAll(): void {
		foreach ( self::$instances as $class => $registry ) {
			$registry->clear();
		}
	}

	/**
	 * Utility method to cache a key value in a registry instance,
	 * where the key is the Zid of the cached ZObject. (E.g. a ZLangRegistry
	 * will register the ZLanguage Zid and the language code string as its value)
	 *
	 * @param string $zid
	 * @param string $value
	 */
	public function register( string $zid, string $value ): void {
		$this->registry[ $zid ] = $value;
	}

	/**
	 * Utility method to remove a given Zid from a registry instance
	 *
	 * @param string $zid
	 */
	public function unregister( string $zid ): void {
		unset( $this->registry[ $zid ] );
	}

	/**
	 * Utility method to clear the whole cache of a registry instance and
	 * set it to initial values.
	 */
	public function clear(): void {
		$this->registry = [];
		$this->initialize();
	}

	/**
	 * Utility method to check if the given Zid is cached in the registry.
	 *
	 * @param string $zid
	 * @return bool
	 */
	public function isZidCached( string $zid ): bool {
		return array_key_exists( $zid, $this->registry );
	}
}
