<?php
/**
 * WikiLambda ZObjectSlotDiffRenderer
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjectContent;

use MediaWiki\Content\Content;
use MediaWiki\Diff\SlotDiffRenderer;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffVisualiser;

class ZObjectSlotDiffRenderer extends SlotDiffRenderer {

	public function __construct(
		private readonly ZObjectDiffVisualiser $visualiser,
		private readonly string $languageCode
	) {
	}

	/**
	 * @inheritDoc
	 */
	public function getDiff(
		?Content $oldContent = null,
		?Content $newContent = null
	) {
		$oldObject = ( $oldContent === null ) ? [] : $this->toDiffArray( $oldContent );
		$newObject = ( $newContent === null ) ? [] : $this->toDiffArray( $newContent );

		// Create the entrypoint differ ZObjectDiffer and call doDiff
		$differ = new ZObjectDiffer();
		$diff = $differ->doDiff( $oldObject, $newObject );

		return $this->visualiser->visualiseDiff( $diff, $oldObject, $newObject );
	}

	/**
	 * @inheritDoc
	 *
	 * Group labels are localised, so the rendered diff must be cached per
	 * interface language.
	 */
	public function getExtraCacheKeys() {
		return [ 'lang-' . $this->languageCode ];
	}

	/**
	 * Helper function to extract and transform the data from content before
	 * calling the ZObjectDiffer::doDiff method.
	 *
	 * @param Content $content
	 * @return array
	 */
	private function toDiffArray( Content $content ): array {
		'@phan-var ZObjectContent $content';
		return json_decode( json_encode( $content->getObject() ), true );
	}
}
