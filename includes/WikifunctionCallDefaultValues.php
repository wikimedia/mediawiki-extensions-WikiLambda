<?php
/**
 * WikiLambda WikifunctionCallDefaultValues
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DateTime;
use DateTimeZone;

class WikifunctionCallDefaultValues {

	/**
	 * Returns the map of type IDs to default value callbacks.
	 * Each callback should return a default value for the given type.
	 *
	 * To add default values for other types:
	 * * Add a new entry in the returned array with the type zid
	 *   as the index, and a callable as its value.
	 * * The callable can be an anonymous function or a public static
	 * 	 named function, which should be implemented below.
	 *
	 * @return array
	 */
	private static function getDefaultValueCallbacks(): array {
		return [
			'Z20420' => [ self::class, 'getDefaultDate' ],
		];
	}

	/**
	 * Checks whether a default value callback exists for a given type.
	 *
	 * @param string $type
	 * @return bool
	 */
	public static function hasDefaultValueCallback( string $type ): bool {
		return array_key_exists( $type, self::getDefaultValueCallbacks() );
	}

	/**
	 * Returns a callable that provides a default value for the given type.
	 *
	 * @param string $type
	 * @return callable|null
	 */
	public static function getDefaultValueForType( string $type ): ?callable {
		return self::getDefaultValueCallbacks()[ $type ] ?? null;
	}

	// Callables for each type:

	/**
	 * Default Value Callable for Date/Z20420:
	 * Returns today's date in the current locale in the format 'dd-mm-yyyy'
	 *
	 * @return string
	 */
	public static function getDefaultDate(): string {
		global $wgLocaltimezone;

		$date = new DateTime( 'now', new DateTimeZone( $wgLocaltimezone ?? 'UTC' ) );
		return $date->format( 'd-m-Y' );
	}
}
