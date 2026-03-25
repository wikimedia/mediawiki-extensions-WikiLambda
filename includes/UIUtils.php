<?php
/**
 * WikiLambda UI rendering utilities
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Html\Html;

class UIUtils {
	/**
	 * Generate a Codex progress indicator HTML element.
	 *
	 * @param string $ariaLabel The ARIA label for the progress indicator
	 * @return string The HTML of the progress indicator element
	 */
	public static function createCodexProgressIndicator( string $ariaLabel ): string {
		return Html::rawElement(
			'div',
			[ 'class' => 'cdx-progress-indicator' ],
			Html::rawElement(
				'div',
				[ 'class' => 'cdx-progress-indicator__indicator' ],
				Html::element(
					'progress',
					[
						'class' => 'cdx-progress-indicator__indicator__progress',
						'aria-label' => $ariaLabel
					]
				)
			)
		);
	}

}
