<?php
/**
 * WikiLambda ZError
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;

class ZError extends ZObject {

	/**
	 * Construct a new ZError instance.
	 *
	 * @param ZReference $type ZErrorType Zid
	 * @param ZObject $value Value that describes the ZError
	 */
	public function __construct( $type, $value ) {
		$this->data[ ZTypeRegistry::Z_ERROR_TYPE ] = $type;
		$this->data[ ZTypeRegistry::Z_ERROR_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_ERROR,
			],
			'keys' => [
				ZTypeRegistry::Z_ERROR_TYPE => [
					'type' => ZTypeRegistry::Z_ERRORTYPE,
					'required' => true,
				],
				ZTypeRegistry::Z_ERROR_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT_TYPE,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Type must be a valid Zid that references a ZObject of type Z50
		if ( !isset( $this->data[ ZTypeRegistry::Z_ERROR_TYPE ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_ERROR_TYPE  ] instanceof ZReference ) ) {
			return false;
		}
		$errorType = $this->data[ ZTypeRegistry::Z_ERROR_TYPE ]->getZValue();
		if ( !ZObjectUtils::isValidZObjectReference( $errorType ) ) {
			return false;
		}
		if ( !ZErrorTypeRegistry::singleton()->instanceOfZErrorType( $errorType ) ) {
			return false;
		}
		// Value must be a valid ZObject
		if ( !isset( $this->data[ ZTypeRegistry::Z_ERROR_VALUE ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_ERROR_VALUE ] instanceof ZObject ) ) {
			return false;
		}
		return $this->getZValue()->isValid();
	}

	/**
	 * Get the content of the ZError value.
	 *
	 * @return ZObject Value that describes this ZError
	 */
	public function getZValue(): ZObject {
		return $this->data[ ZTypeRegistry::Z_ERROR_VALUE ];
	}

	/**
	 * Get the Zid that identifies the ZErrorType that describes this ZError
	 *
	 * @return string ZErrorType Zid
	 */
	public function getZErrorType(): string {
		return $this->data[ ZTypeRegistry::Z_ERROR_TYPE ]->getZValue();
	}

	/**
	 * Get a human-readable one-line string that identifies the ZError information
	 *
	 * @param string $renderLanguageCode Language code in which to render the message; if not
	 *   provided, English is used by default.
	 * @return string ZError message
	 */
	public function getMessage( string $renderLanguageCode = 'en' ): string {
		return ZErrorTypeRegistry::singleton()->getZErrorTypeLabel(
			$this->getZErrorType(),
			$renderLanguageCode
		);
	}

	/**
	 * Get a human-readable one-line string that identifies the ZError information
	 *
	 * @param string $renderLanguageCode Language code in which to render the message; if not
	 *   provided, English is used by default.
	 * @return string ZError message
	 */
	public function getHtmlMessage( string $renderLanguageCode = 'en' ): string {
		$message = ZErrorTypeRegistry::singleton()->getZErrorTypeLabel(
			$this->getZErrorType(),
			$renderLanguageCode
		);
		$messages = [];

		$errorType = $this->getZErrorType();

		// Errors that have message key: Z500, Z557
		// Get error message from K1 (if not null)
		if (
			( $errorType === ZErrorTypeRegistry::Z_ERROR_UNKNOWN ) ||
			( $errorType === ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT )
		) {
			$errorValue = $this->getZValue();
			$messageKey = $errorValue->getValueByKey( 'K1' );
			$message = $messageKey ? $messageKey->getZValue() : $message;
		}

		// Errors that can have children: Z509, Z502, Z522, Z526
		// List of children in K1:
		// * Z509/List of errors
		if ( $errorType === ZErrorTypeRegistry::Z_ERROR_LIST ) {
			$errorValue = $this->getZValue();
			$subErrors = $errorValue->getValueByKey( 'K1' );

			if ( is_array( $subErrors ) || ( $subErrors instanceof ZTypedList ) ) {
				foreach ( ZObjectUtils::getIterativeList( $subErrors ) as $subError ) {
					$messages[] = Html::rawElement(
						'li',
						[ 'class' => 'ext-wikilambda-app-suberror-list__item' ],
						$subError->getHtmlMessage( $renderLanguageCode )
					);
				}
			}
		}

		// Only child in K2:
		// * Z502/Not wellformed
		// * Z522/Array element not wellformed
		if (
			( $errorType === ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED ) ||
			( $errorType === ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED ) ||
			( $errorType === ZErrorTypeRegistry::Z_ERROR_ARRAY_ELEMENT_NOT_WELLFORMED )
		) {
			$errorValue = $this->getZValue();
			$subError = $errorValue->getValueByKey( 'K2' );
			'@phan-var ZError $subError';
			$messages[] = Html::rawElement(
				'li',
				[ 'class' => 'ext-wikilambda-app-suberror-list__item' ],
				$subError->getHtmlMessage( $renderLanguageCode )
			);
		}

		// Add failing key information to message:
		// * Z526/Key value not wellformed
		if ( $errorType === ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED ) {
			$errorValue = $this->getZValue();
			$errorKey = $errorValue->getValueByKey( 'K1' );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZKey $errorKey';
			$errorKeyLabel = $errorKey->getKeyLabel();
			$message .= ': ' . $errorKeyLabel;
		}

		if ( count( $messages ) > 0 ) {
			$message .= Html::rawElement(
				'ul',
				[ 'class' => 'ext-wikilambda-app-suberror-list' ],
				implode( '', $messages )
			);
		}

		return $message;
	}

	/**
	 * Get all ZError related information in different forms for API failure response.
	 *
	 * @return array
	 */
	public function getErrorData() {
		return [
			'title' => $this->getMessage(),
			'message' => $this->getHtmlMessage(),
			'zerror' => $this->getSerialized(),
			'labelled' => $this->getHumanReadable(),
		];
	}
}
