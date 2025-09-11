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
const { defineComponent } = require( 'vue' );
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
	computed: {
		/**
		 * Returns the appropriate label for the checkbox based on the input type
		 *
		 * @return {string}
		 */
		checkboxLabel: function () {
			switch ( this.inputType ) {
				case Constants.Z_GREGORIAN_CALENDAR_DATE:
					return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-date' ).text();
				case Constants.Z_WIKIDATA_ITEM:
				case Constants.Z_WIKIDATA_REFERENCE_ITEM:
					return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-wikidata-item' ).text();
				case Constants.Z_NATURAL_LANGUAGE:
					return this.$i18n( 'wikilambda-visualeditor-wikifunctionscall-default-value-language' ).text();
				default:
					return '';
			}
		}
	},
	methods: {
		/**
		 * Handles checkbox change and emits the new state
		 *
		 * @param {boolean} isChecked
		 */
		handleCheckboxChange: function ( isChecked ) {
			this.$emit( 'update:isChecked', isChecked );
		}
	}
} );
</script>
