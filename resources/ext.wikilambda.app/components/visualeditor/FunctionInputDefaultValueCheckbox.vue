<!--
	WikiLambda Vue component for default value checkbox in Visual Editor
	Wikifunctions function call input fields.

	@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
	@license MIT
-->
<template>
	<div v-if="checkboxLabel" class="ext-wikilambda-app-function-input-default-value-checkbox">
		<cdx-checkbox
			:model-value="isChecked"
			@update:model-value="handleCheckboxChange"
		>
			{{ checkboxLabel }}
		</cdx-checkbox>
	</div>
</template>

<script>
const { computed, defineComponent, inject } = require( 'vue' );
const Constants = require( '../../Constants.js' );

// Codex components
const { CdxCheckbox } = require( '../../../codex.js' );

module.exports = exports = defineComponent( {
	name: 'wl-function-input-default-value-checkbox',
	components: {
		'cdx-checkbox': CdxCheckbox
	},
	props: {
		inputType: {
			type: String,
			required: true
		},
		isChecked: {
			type: Boolean,
			required: true
		}
	},
	emits: [ 'update:isChecked' ],
	setup( props, { emit } ) {
		const i18n = inject( 'i18n' );

		// Checkbox label
		/**
		 * Returns the appropriate label for the checkbox based on the input type
		 *
		 * @return {string}
		 */
		const checkboxLabel = computed( () => {
			switch ( props.inputType ) {
				case Constants.Z_GREGORIAN_CALENDAR_DATE:
					return i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-date' ).text();
				case Constants.Z_WIKIDATA_ITEM:
				case Constants.Z_WIKIDATA_REFERENCE_ITEM:
					return i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-wikidata-item' ).text();
				case Constants.Z_NATURAL_LANGUAGE:
					return i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-language' ).text();
				default:
					return '';
			}
		} );

		// Actions
		/**
		 * Handles checkbox change and emits the new state
		 *
		 * @param {boolean} isChecked
		 */
		function handleCheckboxChange( isChecked ) {
			emit( 'update:isChecked', isChecked );
		}

		return {
			checkboxLabel,
			handleCheckboxChange
		};
	}
} );
</script>
