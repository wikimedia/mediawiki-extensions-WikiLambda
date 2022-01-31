<template>
	<!--
		WikiLambda Vue interface module for selecting a ZNaturalLanguage,
		with autocompletion on name and filtering of 'used' languages,
		based on our ZObjectSelector component.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<span class="ext-wikilambda-select-zobject">
		<a
			v-if="readonly || getViewMode"
			:href="'/wiki/' + type"
			:target="referenceLinkTarget"
		>
			{{ selectedText }}
		</a>
		<sd-autocomplete-search-input
			v-else
			name="zobject-selector"
			:class="{ 'ext-wikilambda-zkey-input-invalid': validatorIsInvalid }"
			:label="$i18n( 'wikilambda-editor-label-addlanguage-label' )"
			:placeholder="$i18n( 'wikilambda-editor-label-addlanguage-label' )"
			:search-placeholder="$i18n( 'wikilambda-function-definition-inputs-item-selector-search-placeholder' )"
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@submit="onSubmit"
			@clear-lookup-results="onClearLookupResults"
		>
		</sd-autocomplete-search-input>
		<sd-message
			v-if="validatorIsInvalid"
			:inline="true"
			type="error"
		> {{ validatorErrorMessage }} </sd-message>
	</span>
</template>

<script>
var Constants = require( '../Constants.js' ),
	ZObjectSelector = require( './ZObjectSelector.vue' ),
	SdAutocompleteSearchInput = require( './base/AutocompleteSearchInput.vue' ),
	SdMessage = require( './base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

// @vue/component
module.exports = {
	components: {
		'sd-autocomplete-search-input': SdAutocompleteSearchInput,
		'sd-message': SdMessage
	},
	extends: ZObjectSelector,
	props: {
		usedLanguages: {
			type: Array,
			default: function () {
				return [];
			}
		},
		type: {
			type: String,
			default: Constants.Z_NATURAL_LANGUAGE
		}
	},
	computed: $.extend( mapGetters( [ 'getViewMode' ] ), {
		usedLanguageZids: function () {
			return this.usedLanguages.map( function ( language ) {
				return language.Z9K1;
			} );
		},
		lookupLabels: function () {
			var filteredResults = Object.keys( this.lookupResults ).filter( function ( key ) {
				return this.usedLanguageZids.indexOf( key ) === -1;
			}.bind( this ) );

			return filteredResults.map( function ( key ) {
				var label = this.zkeyLabels[ key ],
					result = this.lookupResults[ key ];

				if ( label === result ) {
					return result;
				} else {
					return result + ' (' + label + ')';
				}
			}.bind( this ) );
		}
	} )
};
</script>
