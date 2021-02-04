<?php
/**
 * WikiLambda content handler for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use FormatJson;
use JsonContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\MediaWikiServices;
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
	 * @return ZObjectContent
	 */
	public function makeEmptyContent() {
		return new ZObjectContent(
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
		return ZObjectContent::class;
	}

	/**
	 * @param Title $zObjectTitle The page to fetch.
	 * @param string|null $languageCode The language in which to return results. If unset, all results are returned.
	 * @return string The external JSON form of the given title.
	 */
	public static function getExternalRepresentation( Title $zObjectTitle, ?string $languageCode = null ) : string {
		if ( $zObjectTitle->getNamespace() !== NS_ZOBJECT ) {
			throw new \InvalidArgumentException( "Provided page '$zObjectTitle' is not in the ZObject namespace." );
		}

		if ( $zObjectTitle->getContentModel() !== CONTENT_MODEL_ZOBJECT ) {
			throw new \InvalidArgumentException( "Provided page '$zObjectTitle' is not a ZObject content type." );
		}

		$zObject = ZObjectContent::getObjectFromDB( $zObjectTitle );

		if ( $zObject === false ) {
			throw new \InvalidArgumentException( "Provided page '$zObjectTitle' could not be fetched from the DB." );
		}

		$object = get_object_vars( ZObjectUtils::canonicalize( $zObject->getData()->getValue() ) );

		if ( $languageCode ) {
			$services = MediaWikiServices::getInstance();

			if ( !$services->getLanguageNameUtils()->isValidCode( $languageCode ) ) {
				throw new \InvalidArgumentException( "Provided language code '$languageCode' is not valid." );
			}

			$fullLabels = $zObject->getLabels();
			$returnLanguage = new \Language(
				$languageCode,
				$services->getLocalisationCache(),
				$services->getLanguageNameUtils(),
				$services->getLanguageFallback(),
				$services->getLanguageConverterFactory(),
				$services->getHookContainer()
			);
			$returnLabel = $fullLabels->getStringForLanguage( $returnLanguage );

			$returnLabelObject = (object)[
				'Z1K1' => 'Z12',
				'Z12K1' => [ [ 'Z1K1' => 'Z11', 'Z11K1' => $languageCode, 'Z11K2' => $returnLabel ] ]
			];
			// new ZMultiLingualString( [ new ZMonoLingualString( $languageCode, $returnLabel ) ] );
			$object['Z2K3'] = $returnLabelObject;
		}

		// Replace Z2K1: Z0 with the actual page ID.
		$object['Z2K1'] = $zObjectTitle->getDBkey();

		$encoded = FormatJson::encode( $object, true, FormatJson::UTF8_OK );

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

	public function getActionOverrides() {
		return [
			'edit' => ZObjectEditAction::class
		];
	}
}
