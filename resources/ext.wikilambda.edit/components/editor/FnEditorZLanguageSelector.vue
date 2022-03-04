<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-language-selector">
		<select v-model="zLanguageValue">
			<option
				v-for="language in currentZObjectLanguages"
				:key="language.Z9K1"
				:value="language.Z9K1"
			>
				{{ getZkeyLabels[ language.Z9K1 ] }}
			</option>
		</select>

		<template v-if="showAddLanguage">
			<z-natural-language-selector
				:used-languages="currentZObjectLanguages"
				@input="addNewLang"
			></z-natural-language-selector>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZNaturalLanguageSelector = require( '../ZNaturalLanguageSelector.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	components: {
		'z-natural-language-selector': ZNaturalLanguageSelector
	},
	props: {
		showAddLanguage: {
			type: Boolean,
			// eslint-disable-next-line vue/no-boolean-default
			default: true
		},
		zLanguage: {
			type: String,
			default: ''
		}
	},
	data: function () {
		return {
			localZLanguage: ''
		};
	},
	computed: $.extend( mapGetters( [
		'currentZObjectLanguages',
		'getNestedZObjectById',
		'getZkeyLabels'
	] ), {
		zLanguageValue: {
			get: function () {
				return this.localZLanguage || this.zLanguage;
			},
			set: function ( value ) {
				this.setLocalZLanguage( value );
			}
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString'
	] ), {
		setLocalZLanguage: function ( lang ) {
			this.localZLanguage = lang;

			this.$emit( 'change', {
				label: this.getZkeyLabels[ lang ],
				zLang: lang
			} );
		},
		addNewLang: function ( zId ) {
			if ( !zId ) {
				return;
			}

			var lang = zId,
				zLabelParentId = this.getNestedZObjectById( 0, [
					Constants.Z_PERSISTENTOBJECT_LABEL,
					Constants.Z_MULTILINGUALSTRING_VALUE
				] ).id,
				payload = {
					lang: lang,
					parentId: zLabelParentId
				};

			this.addZMonolingualString( payload );

			this.setLocalZLanguage( zId );
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-language-selector {
	select {
		background: #f8f9fa;
		border: 1px solid #72777d;
		box-sizing: border-box;
		border-radius: 2px;
		height: 32px;
		padding: 6px 12px 6px 8px;
		font-size: 1em;
		line-height: 1.4em;
	}
}
</style>
