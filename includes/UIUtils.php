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
	 * Generate an inline Codex error chip (cdx-info-chip--error).
	 *
	 * Inline styles are required because Codex does not support inline chip rendering natively.
	 *
	 * @param string $errorKey i18n message key for the visible error text
	 * @param string $dataErrorKey Value for the data-error-key attribute (defaults to $errorKey)
	 * @return string HTML string
	 */
	public static function createErrorChip( string $errorKey, string $dataErrorKey = '' ): string {
		return Html::rawElement(
			'span',
			[
				'class' => 'cdx-info-chip cdx-info-chip--error',
				'style' => 'position:relative;line-height:var(--line-height-medium,1.375rem);'
					. 'padding-left:calc(var(--font-size-medium,1rem) + calc(var(--font-size-medium,1rem) - 6px));',
				'data-error-key' => $dataErrorKey !== '' ? $dataErrorKey : $errorKey,
			],
			Html::element(
				'span',
				[
					'class' => 'cdx-info-chip__icon',
					'style' => 'position:absolute;left:calc((var(--font-size-medium,1rem) - 2px) * .5);',
					'aria-hidden' => 'true',
				]
			) .
			Html::element(
				'span',
				[
					'class' => 'cdx-info-chip__text',
					'style' => 'font-size:var(--font-size-medium,1rem);',
				],
				wfMessage( $errorKey )->text()
			)
		);
	}

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
