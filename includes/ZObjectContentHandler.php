<?php
/**
 * WikiLambda content handler for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use FormatJson;
use JsonContentHandler;
use MediaWiki\Revision\SlotRenderingProvider;
use MWException;
use Title;

class ZObjectContentHandler extends JsonContentHandler {

	public function __construct( $modelId ) {
		if ( $modelId !== CONTENT_MODEL_ZOBJECT ) {
			throw new MWException( __CLASS__ . " initialised for invalid content model" );
		}

		parent::__construct( CONTENT_MODEL_ZOBJECT );
	}

	public function canBeUsedOn( Title $title ) {
		return $title->inNamespace( NS_ZOBJECT );
	}

	/**
	 * @return ZPersistentObject
	 */
	public function makeEmptyContent() {
		return new ZPersistentObject(
			'{' . "\n"
				. '  "' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_PERSISTENTOBJECT . '",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_ID . '": "Z0",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE . '": "",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL . '": {' . "\n"
				 . '    "' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_MULTILINGUALSTRING . '",' . "\n"
				 . '    "' . ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE . '": []' . "\n"
				 . '  }' . "\n"
			. '}'
		);
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return ZPersistentObject::class;
	}

	/**
	 * @param Title $zObjectTitle The page to fetch.
	 * @return string The external JSON form of the given title.
	 */
	public static function getExternalRepresentation( Title $zObjectTitle ) : string {
		if ( $zObjectTitle->getNamespace() !== NS_ZOBJECT ) {
			throw new \InvalidArgumentException( "Provided page '$zObjectTitle' is not in the ZObject namespace." );
		}

		if ( $zObjectTitle->getContentModel() !== CONTENT_MODEL_ZOBJECT ) {
			throw new \InvalidArgumentException( "Provided page '$zObjectTitle' is not a ZObject content type." );
		}

		$zObject = ZPersistentObject::getObjectFromDB( $zObjectTitle );

		$json = get_object_vars( ZObjectUtils::canonicalize( $zObject->getData()->getValue() ) );

		// Replace Z2K1: Z0 with the actual page ID.
		$json['Z2K1'] = $zObjectTitle->getDBkey();

		$encoded = FormatJson::encode( $json, true, FormatJson::UTF8_OK );

		return $encoded;
	}

	public function getSecondaryDataUpdates(
		Title $title,
		Content $content,
		$role,
		SlotRenderingProvider $slotOutput
	) {
		return array_merge(
			parent::getSecondaryDataUpdates( $title, $content, $role, $slotOutput ),
			[ new ZObjectSecondaryDataUpdate( $title, $content ) ]
		);
	}

	public function getDeletionUpdates( Title $title, $role ) {
		return array_merge(
			parent::getDeletionUpdates( $title, $role ),
			[ new ZObjectSecondaryDataRemoval( $title ) ]
		);
	}
}
