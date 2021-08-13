<template>
	<select
		:value="value"
		@change="$emit( 'change', $event )"
	>
		<option
			selected
			disabled
			value="None"
		>
			{{ $i18n( 'wikilambda-editor-label-addlanguage-label' ) }}
		</option>
		<option
			v-for="(langName, langId) in unusedLangList"
			:key="langId"
			:value="langId"
		>
			{{ langName }}
		</option>
	</select>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	props: {
		usedLanguages: {
			type: Array,
			default: function () {
				return [];
			}
		},
		value: {
			type: String,
			default: 'None'
		}
	},
	computed: $.extend( mapGetters( [
		'getAllLangs',
		'getZObjectAsJsonById'
	] ), {
		unusedLangList: function () {
			return Object.keys( this.getAllLangs )
				.filter( this.isLangCodeAvailable )
				.reduce( function ( unusedLangList, lang ) {
					unusedLangList[ lang ] = this.getAllLangs[ lang ];
					return unusedLangList;
				}.bind( this ), {} );
		}
	} ),
	methods: {
		isLangCodeAvailable: function ( langCode ) {
			var usedLangIndex;
			for ( usedLangIndex in this.usedLanguages ) {
				if ( this.usedLanguages[ usedLangIndex ][ Constants.Z_REFERENCE_ID ] === langCode ) {
					return false;
				}
			}

			return true;
		}
	}
};
</script>
