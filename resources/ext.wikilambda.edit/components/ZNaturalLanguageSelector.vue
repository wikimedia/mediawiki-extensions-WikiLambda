<template>
	<!--
		WikiLambda Vue interface module for selecting a ZNaturalLanguage,
		with autocompletion on name and filtering of 'used' languages,
		based on our ZObjectSelector component.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
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
			ref="searchInput"
			name="zobject-selector"
			:class="{ 'ext-wikilambda-zkey-input-invalid': validatorIsInvalid }"
			:label="$i18n( 'wikilambda-editor-label-addlanguage-label' )"
			:placeholder="$i18n( 'wikilambda-editor-label-addlanguage-label' )"
			:initial-value="selectedText"
			:lookup-results="lookupLabels"
			@input="onInput"
			@blur="onSubmit"
			@submit="onSubmit"
			@clear="onClear"
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
var ZObjectSelector = require( './ZObjectSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	extends: ZObjectSelector,
	props: {
		usedLanguages: {
			type: Array,
			default: function () {
				return [];
			}
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
	} ),
	methods: {
		emitInput: function ( zId ) {
			var exists = false;

			for ( var zLang in this.usedLanguages ) {
				if ( this.usedLanguages[ zLang ].Z9K1 === zId ) {
					exists = true;
					break;
				}
			}

			if ( !exists ) {
				this.$emit( 'input', zId );
				if ( zId ) {
					this.$refs.searchInput.onClear();
				}
			} else {
				this.$refs.searchInput.onClear();
			}
		}
	}
};
</script>
