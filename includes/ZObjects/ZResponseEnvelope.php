<?php
/**
 * WikiLambda ZResponseEnvelope
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use stdClass;

class ZResponseEnvelope extends ZObject {

	/**
	 * Construct a new ZResponseEnvelope instance
	 *
	 * @param ?ZObject $response Value of the response
	 * @param ?ZObject $metadata Meta-data response
	 */
	public function __construct( $response, $metadata ) {
		$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ] = $response ?? ZTypeRegistry::Z_VOID_INSTANCE;
		$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ] = $metadata ?? ZTypeRegistry::Z_VOID_INSTANCE;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_RESPONSEENVELOPE,
			],
			'keys' => [
				ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT
				],
				ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA => [
					'type' => ZTypeRegistry::Z_OBJECT
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		return (
			$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ] instanceof ZObject &&
			$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ]->isValid() ||
			$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ] instanceof ZObject &&
			$this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ]->isValid()
		);
	}

	/**
	 * Get the value part of the response envelope
	 *
	 * @return ZObject
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE ];
	}

	/**
	 * Get the Meta-data part of the response envelope
	 *
	 * TODO (T307483): This should ideally be type-hinted as a PHP implementation of ZMap,
	 * so that it'd be much easier to interact with.
	 *
	 * @return ZObject
	 */
	public function getZMetadata() {
		return $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ];
	}

	/**
	 * Does the meta-data in the response envelope have one or more fatal errors?
	 *
	 * @return bool
	 */
	public function hasErrors(): bool {
		// TODO (T291136): This should be reading a ZMap 'errors' value
		$errors = $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ];

		return (
			is_object( $errors ) &&
			(
				// A real, live ZError
				$errors instanceof ZError ||
				// An uninstantiated ZObject
				(
					$errors instanceof stdClass &&
					property_exists( $errors, ZTypeRegistry::Z_OBJECT_TYPE ) &&
					(
						$errors->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_ERROR ||
						(
							$errors->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_REFERENCE
							&& $errors->{ ZTypeRegistry::Z_REFERENCE_VALUE } === ZTypeRegistry::Z_ERROR
						)
					)
				)
			)
		);
	}

	/**
	 * Does the meta-data in the response envelope have one or more fatal errors?
	 *
	 * @return ZError|null
	 */
	public function getErrors(): ?ZError {
		// TODO (T291136): This should be reading a ZMap 'errors' value
		return $this->data[ ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA ];
	}
}
