<template>
	<!--
		WikiLambda Vue interface module for editing ZCode objects.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zcode">
		<select
			v-model="selectedLanguage"
			class="ext-wikilambda-zcode__language-selector"
		>
			<option value="" disabled>
				{{ $i18n('wikilambda-editor-label-select-programming-language-label') }}
			</option>
			<option
				v-for="zProgrammingLang in zProgrammingLangs"
				:key="zProgrammingLang.Z2K1"
				:value="zProgrammingLang.Z2K2.Z61K1"
			>
				{{ zProgrammingLang.Z2K2.Z61K2 }}
			</option>
		</select>
		<code-editor
			:mode="selectedLanguage"
			:read-only="!selectedLanguage || viewmode"
			:value="codeValue"
			@change="updateCode"
		></code-editor>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	typeUtils = require( './../../mixins/typeUtils.js' ),
	CodeEditor = require( '../base/CodeEditor.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	components: {
		'code-editor': CodeEditor
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		viewmode: {
			type: Boolean,
			required: true
		}
	},
	data: function () {
		return {
			codeValue: ''
		};
	},
	mixins: [ typeUtils ],
	computed: $.extend(
		mapGetters( [
			'zProgrammingLangs',
			'getZObjectChildrenById'
		] ),
		{
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zCodeLanguage: function () {
				return this.findKeyInArray( Constants.Z_CODE_LANGUAGE, this.zobject );
			},
			zCodeProgrammingLanguage: function () {
				var languageChildren,
					programmingLanguageCodeItem;

				languageChildren = this.getZObjectChildrenById( this.zCodeLanguage.id );
				if ( languageChildren.length === 0 ) {
					return;
				}
				programmingLanguageCodeItem = this.findKeyInArray(
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					languageChildren
				);

				return programmingLanguageCodeItem;
			},
			codeItem: function () {
				return this.findKeyInArray( Constants.Z_CODE_CODE, this.zobject );
			},
			selectedLanguage: {
				get: function () {
					if ( this.zCodeProgrammingLanguage ) {
						return this.zCodeProgrammingLanguage.value;
					} else {
						return '';
					}
				},
				set: function ( val ) {
					this.selectLanguage( val );
				}
			}
		} ),
	methods: $.extend(
		mapActions( [
			'fetchAllZProgrammingLanguages',
			'setZCodeLanguage',
			'setZObjectValue'
		] ),
		{
			/**
			 * Sets the value Z_PROGRAMMING_LANGUAGE_CODE.
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				var payload = {
					id: this.zCodeLanguage.id,
					value: value
				};
				this.setZCodeLanguage( payload );
			},
			updateCode: function ( code ) {
				var payload = {
					id: this.codeItem.id,
					value: code
				};
				this.setZObjectValue( payload );
			}
		} ),
	mounted: function () {
		if ( this.zProgrammingLangs.length <= 0 ) {
			this.fetchAllZProgrammingLanguages();
		}

		// Assigning the value this way prevents a bug,
		// that would move the cursor to the end of the string on every keypress
		if ( this.codeItem.value ) {
			this.codeValue = this.codeItem.value;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zcode {
	display: block;
	padding: 1em;
	outline: 1px dashed #888;
	width: 600px;

	&__language-selector {
		width: 200px;
	}
}
</style>
