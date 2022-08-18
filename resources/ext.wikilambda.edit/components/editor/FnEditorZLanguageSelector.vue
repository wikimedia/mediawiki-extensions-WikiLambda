<template>
	<!--
		WikiLambda Vue component for the selection of a ZNaturalLanguage object inside the Function editor.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-language-selector">
		<!-- eslint-disable vue/no-v-model-argument -->
		<!-- eslint-disable vue/no-unsupported-features -->
		<cdx-select
			v-model:selected="zLanguageValue"
			class="ext-wikilambda-language-selector__select"
			:default-label="getZkeyLabels[ zLanguageValue ]"
			:menu-items="languageList"
		>
		</cdx-select>

		<template v-if="showAddLanguage">
			<z-object-selector
				ref="langSelector"
				class="ext-wikilambda-language-selector__add-language"
				:used-languages="currentZObjectLanguages"
				:type="Constants.Z_NATURAL_LANGUAGE"
				@input="addNewLang"
			></z-object-selector>
		</template>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	CdxSelect = require( '@wikimedia/codex' ).CdxSelect,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

// @vue/component
module.exports = exports = {
	components: {
		'cdx-select': CdxSelect,
		'z-object-selector': ZObjectSelector
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
		Constants: function () {
			return Constants;
		},
		zLanguageValue: {
			get: function () {
				return this.localZLanguage || this.zLanguage;
			},
			set: function ( value ) {
				this.setLocalZLanguage( value );
			}
		},
		languageList: function () {
			return this.currentZObjectLanguages.map( function ( language ) {
				return {
					label: this.getZkeyLabels[ language.Z9K1 ],
					value: language.Z9K1
				};
			}.bind( this ) );
		}
	} ),
	methods: $.extend( mapActions( [
		'addZMonolingualString'
	] ), {
		setLocalZLanguage: function ( lang ) {
			this.localZLanguage = lang;
			this.$emit( 'change', lang );
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
			this.$refs.langSelector.clearResults();
		}
	} )
};
</script>

<style lang="less">
.ext-wikilambda-language-selector {
	&__select {
		min-width: 100px;
	}

	&__add-language {
		margin-left: 10px;
	}
}
</style>
