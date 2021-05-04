<template>
	<div class="ext-wikilambda-json ext-wikilambda-zcode">
		<code-editor
			mode="json"
			:value="initialJson"
			:read-only="viewmode"
			@change="codeChangeHandler"
		></code-editor>
	</div>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	typeUtils = require( '../mixins/typeUtils.js' ),
	CodeEditor = require( './base/CodeEditor.vue' );

module.exports = {
	components: {
		'code-editor': CodeEditor
	},
	mixins: [ typeUtils ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		viewmode: {
			type: Boolean,
			default: false
		}
	},
	data: function () {
		return {
			codeEditorState: '',
			initialJson: ''
		};
	},
	computed: $.extend( {},
		mapGetters( [ 'getZObjectAsJsonById', 'getZObjectById' ] ),
		{
			zobject: function () {
				return this.getZObjectById( this.zobjectId );
			},
			zobjectJson: function () {
				return JSON.stringify( this.getZObjectAsJsonById( this.zobjectId, this.zobject.value === 'array' ), null, 4 );
			}
		}
	),
	methods: {
		codeChangeHandler: function ( val ) {
			this.codeEditorState = val;
		}
	},
	watch: {
		codeEditorState: function () {
			try {
				var self = this;

				self.$store.dispatch( 'injectZObject', {
					zobject: JSON.parse( this.codeEditorState ),
					key: this.zobject.key,
					id: this.zobjectId,
					parent: this.zobject.parent
				} ).then( function ( newType ) {
					if ( self.isValidZidFormat( newType ) ) {
						self.$emit( 'change-literal', newType );
					}
				} );
			} catch ( error ) {
				// JSON parse failed
			}
		}
	},
	mounted: function () {
		this.codeEditorState = this.zobjectJson;
		this.initialJson = this.zobjectJson;
	}
};
</script>

<style lang="less">
.ext-wikilambda-json {
	white-space: pre-wrap;
	font-family: 'Courier New', 'Courier', monospace;
}
</style>
