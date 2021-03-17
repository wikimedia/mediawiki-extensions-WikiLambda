<template>
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
			:read-only="!selectedLanguage"
			@change="updateCode"
		></code-editor>
	</div>
</template>

<script>
var CodeEditor = require( '../base/CodeEditor.vue' ),
	mapActions = require( 'vuex' ).mapActions,
	mapGetters = require( 'vuex' ).mapGetters;

module.exports = {
	components: {
		'code-editor': CodeEditor
	},
	props: {
		zobject: {
			type: Object,
			default: function () {
				return {};
			}
		}
	},
	computed: $.extend( mapGetters( [ 'zProgrammingLangs' ] ), {
		selectedLanguage: {
			get: function () {
				if ( this.zobject.Z16K1 ) {
					return this.zobject.Z16K1.Z61K1;
				} else {
					return '';
				}
			},
			set: function ( val ) {
				this.selectLanguage( val );
			}
		}
	} ),
	methods: $.extend( mapActions( [ 'fetchAllZProgrammingLanguages' ] ), {
		selectLanguage: function ( language ) {
			this.$emit( 'update', {
				key: 'Z16K1',
				value: {
					Z1K1: 'Z61',
					Z61K1: language
				}
			} );
		},
		updateCode: function ( code ) {
			this.$emit( 'update', {
				key: 'Z16K2',
				value: code
			} );
		}
	} ),
	mounted: function () {
		if ( this.zProgrammingLangs.length <= 0 ) {
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
	width: 600px;

	&__language-selector {
		width: 200px;
	}
}
</style>
