<template>
	<!--
		WikiLambda Vue component for ZCode objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zcode">
		<span v-if="viewmode || readonly">{{ selectedLanguage }}</span>
		<select
			v-else
			v-model="selectedLanguage"
			class="ext-wikilambda-zcode__language-selector"
		>
			<option value="" disabled>
				{{ $i18n( 'wikilambda-editor-label-select-programming-language-label' ) }}
			</option>
			<option
				v-for="zProgrammingLang in getAllProgrammingLangs"
				:key="zProgrammingLang.Z2K1"
				:value="zProgrammingLang.Z2K2.Z61K1"
			>
				{{ zProgrammingLang.Z2K2.Z61K2 }}
			</option>
		</select>
		<code-editor
			:mode="selectedLanguage"
			:read-only="!selectedLanguage || viewmode || readonly"
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

// @vue/component
module.exports = {
	components: {
		'code-editor': CodeEditor
	},
	mixins: [ typeUtils ],
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		readonly: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			codeValue: '',
			allowCodeValueOverride: true
		};
	},
	computed: $.extend(
		mapGetters( [
			'getAllProgrammingLangs',
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
				return this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray(
							Constants.Z_PROGRAMMING_LANGUAGE_CODE,
							this.getZObjectChildrenById( this.zCodeLanguage.id )
						).id
					)
				);
			},
			codeItem: function () {
				return this.findKeyInArray( Constants.Z_CODE_CODE, this.zobject );
			},
			selectedLanguage: {
				get: function () {
					if ( this.zCodeProgrammingLanguage ) {
						return this.zCodeProgrammingLanguage.value || '';
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
			'addZString',
			'injectZObject'
		] ),
		{
			/**
			 * Sets the value Z_PROGRAMMING_LANGUAGE_CODE.
			 *
			 * @param {string} value
			 */
			selectLanguage: function ( value ) {
				this.allowCodeValueOverride = true;

				var payload = {
					id: this.zCodeLanguage.id,
					value: value
				};
				this.setZCodeLanguage( payload );
			},
			updateCode: function ( code ) {
				var payload = {
					zobject: {
						Z1K1: Constants.Z_STRING,
						Z6K1: code
					},
					id: this.codeItem.id,
					key: Constants.Z_CODE_CODE,
					parent: this.zobjectId
				};

				this.injectZObject( payload );
			}
		} ),
	watch: {
		codeItem: {
			immediate: true,
			handler: function () {
				var codeValue;

				// Assigning the value this way prevents a bug,
				// that would move the cursor to the end of the string on every keypress
				codeValue = this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById( this.codeItem.id )
				);
				if ( codeValue && this.allowCodeValueOverride ) {
					this.codeValue = codeValue.value;
					this.allowCodeValueOverride = false;
				}
			}
		}
	},
	mounted: function () {
		if ( this.getAllProgrammingLangs.length <= 0 ) {
			this.fetchAllZProgrammingLanguages();
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zcode {
	display: block;
	padding: 1em;
	outline: 1px dashed #888;
	max-width: 600px;

	&__language-selector {
		width: 200px;
	}
}

@media only screen and ( min-width: 600px ) {
	.ext-wikilambda-zcode {
		width: 600px;
	}
}
</style>
