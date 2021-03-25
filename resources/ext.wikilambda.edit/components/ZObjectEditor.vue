<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<z-object
			:zobject="zobject"
			:persistent="true"
			:viewmode="false"
			@input="updateZobject"
		></z-object>
		<div>
			<!-- TODO: Replace this with a full save dialog (copywarn, IPwarn, minor edit box, …)? -->
			<label for="summary"> {{ $i18n( 'wikilambda-summarylabel' ) }} </label>
			<input v-model="summary"
				class="ext-wikilambda-editSummary"
				name="summary"
			>
		</div>
		<button @click="submit">
			{{ submitButtonLabel }}
		</button>
		<p>Current ZObject: {{ zobject }} </p>
		<wbmi-message v-if="message.text" :type="message.type">
			{{ message.text }}
		</wbmi-message>
	</div>
</template>

<script>
var ZObject = require( './ZObject.vue' ),
	WbmiMessage = require( './base/Message.vue' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	mapMutations = require( 'vuex' ).mapMutations;

module.exports = {
	name: 'ZObjectEditor',
	components: {
		'z-object': ZObject,
		'wbmi-message': WbmiMessage
	},
	data: function () {
		return {
			summary: ''
		};
	},
	computed: $.extend( mapGetters( {
		zobject: 'getCurrentZObject',
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage'
	} ), {
		submitButtonLabel: function () {
			if ( this.createNewPage ) {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishnew' : 'wikilambda-savenew'
				);
			} else {
				return mw.msg(
					mw.config.get( 'wgEditSubmitButtonLabelPublish' ) ?
						'wikilambda-publishchanges' : 'wikilambda-savechanges'
				);
			}
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'fetchZKeys', 'initializeZObject', 'submitZObject' ] ),
		mapMutations( [ 'addZKeyLabel', 'setZLangs' ] ),
		{
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
			},

			submit: function () {
				this.submitZObject( this.summary );
			}
		}
	),

	created: function () {
		var languageChain = mw.language.getFallbackLanguageChain();

		// Set zobject
		this.initializeZObject();

		// Set user language
		this.setZLangs( languageChain );

		// Fetch Z1 labels to initialize ZObject
		// We can assume that this is not yet present as this is the root component.
		this.fetchZKeys( {
			zids: [ 'Z1' ],
			zlangs: languageChain
		} );
	}
};
</script>

<style lang="less">
.ext-wikilambda-editSummary {
	width: 100%;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
